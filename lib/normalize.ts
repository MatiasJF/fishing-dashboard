import type {
  HidroSnapshot,
  MeteoSnapshot,
  Reading,
  SeccionSnapshot,
  Snapshot,
  SolunarSnapshot,
  SourceResult,
  VedaEstado,
} from "./types";
import type { HidroData } from "./sources/embalses";
import type { AemetContraste } from "./sources/aemet";
import { getOpenMeteo } from "./sources/openMeteo";
import { getAemet } from "./sources/aemet";
import { getSaih, saihUrl } from "./sources/saihTajo";
import { getEmbalses } from "./sources/embalses";
import { getSolunar } from "./sources/solunar";
import { getVeda } from "./sources/veda";
import { toMadridISO } from "./tz";
import { computeActivityIndex } from "./activity";
import type { SiteConfig } from "./types";

/** Resultados crudos de todas las fuentes de un ciclo. */
export interface SourceInputs {
  meteo: SourceResult<MeteoSnapshot>;
  hidroSaih: SourceResult<HidroData>;
  hidroEmbalses: SourceResult<HidroData>;
  solunar: SourceResult<SolunarSnapshot>;
  veda: SourceResult<VedaEstado[]>;
  /** Capa de contraste opcional (no se persiste; no bloquea). */
  aemet?: SourceResult<AemetContraste>;
}

// El SAIH publica por horas con retraso; embalses.net es ~diario. Solo degradamos a
// embalses.net si el SAIH está realmente obsoleto (> 3 h), no por el desfase horario normal.
const HIDRO_FRESCURA_MS = 3 * 60 * 60 * 1000;

/** ¿El dato hidrológico del SAIH es lo bastante fresco como para preferirlo? */
function saihEsFresco(d: HidroData, now: Date): boolean {
  if (!d.fecha_dato) return true; // sin fecha, asumimos en vivo
  const t = new Date(d.fecha_dato).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t <= HIDRO_FRESCURA_MS;
}

/** Convierte un HidroData (SAIH o embalses) en la sección `hidro` del Snapshot. */
function toHidroSnapshot(d: HidroData, ts: string): HidroSnapshot {
  const fetched_at = d.fecha_dato ?? ts;
  const r = <T>(value: T): Reading<T> => ({ value, source: d.source, fetched_at });
  const hidro: HidroSnapshot = {
    volumen_hm3: r(d.volumen_hm3),
    llenado_pct: r(d.llenado_pct),
  };
  if (d.nivel_msnm !== undefined) hidro.nivel_msnm = r(d.nivel_msnm);
  if (d.caudal_entrada_m3s !== undefined) hidro.caudal_entrada_m3s = r(d.caudal_entrada_m3s);
  if (d.caudal_salida_m3s !== undefined) hidro.caudal_salida_m3s = r(d.caudal_salida_m3s);
  return hidro;
}

/**
 * Selección hidrológica con fallback (CLAUDE.md §4.3/§7): SAIH si está OK y fresco;
 * si no, embalses.net; si tampoco, null (el orquestador usará el valor previo).
 */
export function seleccionarHidro(
  saih: SourceResult<HidroData>,
  embalses: SourceResult<HidroData>,
  now: Date
): HidroData | null {
  if (saih.ok && saihEsFresco(saih.data, now)) return saih.data;
  if (embalses.ok) return embalses.data;
  if (saih.ok) return saih.data; // SAIH viejo es mejor que nada
  return null;
}

/**
 * Ensambla el Snapshot a partir de los resultados de las fuentes y, si alguna falla,
 * reutiliza el último valor bueno (`previous`) marcando la sección como `stale`.
 * Función PURA. Lanza solo si una sección obligatoria falla y no hay valor previo.
 */
export function buildSnapshot(
  inputs: SourceInputs,
  previous: Snapshot | null,
  now: Date
): Snapshot {
  const ts = toMadridISO(now);
  const stale: SeccionSnapshot[] = [];
  const faltan: string[] = [];

  // Meteo
  let meteo: MeteoSnapshot | undefined;
  if (inputs.meteo.ok) meteo = inputs.meteo.data;
  else if (previous) {
    meteo = previous.meteo;
    stale.push("meteo");
  } else faltan.push(`meteo (${inputs.meteo.error})`);

  // Hidro
  const hidroData = seleccionarHidro(inputs.hidroSaih, inputs.hidroEmbalses, now);
  let hidro: HidroSnapshot | undefined;
  if (hidroData) hidro = toHidroSnapshot(hidroData, ts);
  else if (previous) {
    hidro = previous.hidro;
    stale.push("hidro");
  } else faltan.push("hidro (SAIH y embalses.net fallaron)");

  // Solunar
  let solunar: SolunarSnapshot | undefined;
  if (inputs.solunar.ok) solunar = inputs.solunar.data;
  else if (previous) {
    solunar = previous.solunar;
    stale.push("solunar");
  } else faltan.push(`solunar (${inputs.solunar.error})`);

  // Veda
  let veda: VedaEstado[] | undefined;
  if (inputs.veda.ok) veda = inputs.veda.data;
  else if (previous) {
    veda = previous.veda;
    stale.push("veda");
  } else faltan.push(`veda (${inputs.veda.error})`);

  if (!meteo || !hidro || !solunar || !veda) {
    throw new Error(
      `No se puede construir el Snapshot (sin valor previo para: ${faltan.join("; ")})`
    );
  }

  const snapshot: Snapshot = { ts, meteo, hidro, solunar, veda };
  if (stale.length) snapshot.stale = stale;
  // Índice de actividad (proxy guardado también en el histórico para predicción).
  snapshot.actividad = computeActivityIndex(snapshot, now);
  return snapshot;
}

/** Ejecuta todas las fuentes en paralelo (cada una resiliente por contrato). */
export async function gatherSources(
  site: SiteConfig,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch
): Promise<SourceInputs> {
  // Endpoint SAIH: del token del sitio; si no hay, cae al de entorno (compat).
  const endpointSaih = site.saih?.token ? saihUrl(site.saih.token) : process.env.SAIH_ENDPOINT;

  // AEMET usa el municipio de San Martín de Valdeiglesias (capa de contraste de San Juan);
  // no se consulta para otros embalses.
  const pedirAemet = site.slug === "san-juan";
  const [meteo, hidroSaih, hidroEmbalses, aemet] = await Promise.all([
    getOpenMeteo(site.lat, site.lon, fetchImpl),
    getSaih(endpointSaih, site.capacidad_hm3, fetchImpl),
    getEmbalses(site.embalsesnet_id, site.slug, fetchImpl),
    pedirAemet
      ? getAemet(process.env.AEMET_API_KEY, undefined, fetchImpl, now)
      : Promise.resolve(undefined),
  ]);
  // Solunar local. La veda parseada solo aplica a embalses de Madrid (Orden CM).
  const solunar = getSolunar(now, site.lat, site.lon);
  const veda: SourceResult<VedaEstado[]> =
    site.comunidad === "Madrid" ? getVeda(now) : { ok: true, data: [] };
  return { meteo, hidroSaih, hidroEmbalses, solunar, veda, aemet };
}
