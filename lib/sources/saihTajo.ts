import { z } from "zod";
import type { SourceResult } from "../types";
import type { HidroData } from "./embalses";
import { offsetMinutes, toMadridISO } from "../tz";

/**
 * Hidrología PRIMARIA: SAIH Tajo (fresca, datos horarios, CLAUDE.md §4.3).
 *
 * El portal (saihtajo.chtajo.es) no documenta su API, pero la ficha de cada estación
 * se sirve por AJAX en:
 *   index.php?w=get-estacion&x=<token-estable-de-la-estacion>
 * y devuelve { response: { codigo, nombre, senales: [...] } }, donde cada "señal" trae
 * su última lectura en `last` ({ valor, tiempo "DD/MM/YYYY HH:mm" }).
 *
 * El token `x` de San Juan (E_19) es estable; va en SAIH_ENDPOINT. Si el endpoint cambia
 * o falla, esta fuente devuelve ok:false y el orquestador degrada a embalses.net.
 */

const SOURCE = "saih";

const SAIH_BASE = "https://saihtajo.chtajo.es/index.php?w=get-estacion&x=";

/** Construye la URL de la ficha de una estación a partir de su token `x`. */
export function saihUrl(token: string): string {
  return SAIH_BASE + token;
}

const senalSchema = z.object({
  nombre: z.string(),
  unidad: z.string().optional(),
  last: z
    .object({
      valor: z.number().nullable(),
      tiempo: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const saihResponseSchema = z.object({
  response: z.object({
    ok: z.union([z.number(), z.boolean()]).optional(),
    codigo: z.string().optional(),
    senales: z.array(senalSchema),
  }),
});

type Senal = z.infer<typeof senalSchema>;

/** "DD/MM/YYYY HH:mm" (hora local de Madrid) → ISO con offset de Madrid. */
export function parseSaihTiempo(t: string | undefined): string | undefined {
  if (!t) return undefined;
  const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return undefined;
  const [, d, mo, y, hh, mm] = m;
  // Interpretamos el reloj de pared como UTC para hallar el offset de ese día y
  // recuperar el instante real; toMadridISO lo reescribe con el offset correcto.
  const asUtc = new Date(`${y}-${mo}-${d}T${hh}:${mm}:00Z`);
  const off = offsetMinutes(asUtc);
  return toMadridISO(new Date(asUtc.getTime() - off * 60_000));
}

/** Busca la primera señal cuyo nombre (en mayúsculas) cumple el predicado y tiene valor. */
function valorDe(
  senales: Senal[],
  pred: (nombre: string, unidad: string) => boolean
): { valor: number; tiempo?: string } | null {
  for (const s of senales) {
    if (!pred(s.nombre.toUpperCase(), (s.unidad ?? "").toLowerCase())) continue;
    const v = s.last?.valor;
    if (typeof v === "number") return { valor: v, tiempo: s.last?.tiempo };
  }
  return null;
}

export function mapSaih(json: unknown, capacidad_hm3?: number): SourceResult<HidroData> {
  const parsed = saihResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: `SAIH payload inválido: ${parsed.error.message}` };
  }
  const senales = parsed.data.response.senales;

  const volumen = valorDe(senales, (n, u) => n.includes("VOLUMEN") && u === "hm3");
  const pct = valorDe(senales, (n) => n.includes("PORCENTUAL"));
  const cota = valorDe(senales, (n) => n.includes("COTA")); // cota absoluta = msnm
  const salida = valorDe(senales, (n) => n.includes("SALIDA"));
  const entrada = valorDe(senales, (n) => n.includes("ENTRADA"));

  // Volumen y % son obligatorios; uno se deriva del otro si falta y hay capacidad.
  let volHm3 = volumen?.valor;
  let llenado = pct?.valor;
  if (volHm3 === undefined && llenado !== undefined && capacidad_hm3) {
    volHm3 = (llenado / 100) * capacidad_hm3;
  }
  if (llenado === undefined && volHm3 !== undefined && capacidad_hm3) {
    llenado = (volHm3 / capacidad_hm3) * 100;
  }
  if (volHm3 === undefined || llenado === undefined) {
    return { ok: false, error: "SAIH: faltan volumen y/o porcentaje de llenado" };
  }

  const data: HidroData = {
    volumen_hm3: Number(volHm3.toFixed(2)),
    llenado_pct: Number(llenado.toFixed(2)),
    source: SOURCE,
    fecha_dato: parseSaihTiempo(volumen?.tiempo ?? pct?.tiempo ?? cota?.tiempo),
  };
  if (cota) data.nivel_msnm = cota.valor;
  if (salida) data.caudal_salida_m3s = salida.valor;
  if (entrada) data.caudal_entrada_m3s = entrada.valor;
  return { ok: true, data };
}

export async function getSaih(
  endpoint: string | undefined = process.env.SAIH_ENDPOINT,
  capacidad_hm3?: number,
  fetchImpl: typeof fetch = fetch
): Promise<SourceResult<HidroData>> {
  if (!endpoint) {
    return { ok: false, error: "SAIH_ENDPOINT no configurado (ver README §SAIH)" };
  }
  try {
    const res = await fetchImpl(endpoint, {
      headers: { "User-Agent": "san-juan-fishing-dashboard" },
    });
    if (!res.ok) return { ok: false, error: `SAIH HTTP ${res.status}` };
    return mapSaih(await res.json(), capacidad_hm3);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
