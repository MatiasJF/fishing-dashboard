/**
 * Tipos centrales del dashboard. El esquema `Snapshot` es el contrato que se escribe
 * en `data/latest.json` y como una línea en `data/history.jsonl` (ver CLAUDE.md §5).
 */

/** Una lectura individual con su procedencia y momento de obtención. */
export interface Reading<T> {
  value: T;
  /** Identificador de la fuente: "openmeteo" | "aemet" | "saih" | "embalsesnet" | "suncalc" | "config" | ... */
  source: string;
  /** ISO 8601, momento en que se obtuvo el dato. */
  fetched_at: string;
}

/**
 * Resultado de una fuente. Por contrato (CLAUDE.md §4) las fuentes NUNCA lanzan:
 * devuelven `{ ok: false, error }` para que el orquestador aplique fallback.
 */
export type SourceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type SeccionSnapshot = "meteo" | "hidro" | "solunar" | "veda";

export interface MeteoSnapshot {
  temp_c: Reading<number>;
  humedad_pct: Reading<number>;
  presion_hpa: Reading<number>;
  presion_delta_24h: Reading<number>;
  presion_delta_48h: Reading<number>;
  viento_kmh: Reading<number>;
  viento_dir_deg: Reading<number>;
  rachas_kmh: Reading<number>;
}

export interface HidroSnapshot {
  nivel_msnm?: Reading<number>;
  volumen_hm3: Reading<number>;
  llenado_pct: Reading<number>;
  caudal_entrada_m3s?: Reading<number>;
  caudal_salida_m3s?: Reading<number>;
}

export interface PeriodoSolunar {
  tipo: "mayor" | "menor";
  inicio: string; // ISO
  fin: string; // ISO
}

export interface SolunarSnapshot {
  fase_lunar: string;
  fraccion_iluminada: number;
  sol: { orto: string; ocaso: string };
  luna: { orto: string | null; ocaso: string | null };
  periodos: PeriodoSolunar[];
}

export interface VedaEstado {
  especie: string;
  estado: "habil" | "veda";
  nota?: string;
}

export interface FactoresActividad {
  /** Aporte 0-100 de cada factor al índice. */
  solunar: number;
  presion: number;
  viento: number;
  luna: number;
}

export interface Actividad {
  /** Índice global de actividad pesquera, 0-100. */
  score: number;
  etiqueta: "baja" | "moderada" | "alta" | "muy alta";
  factores: FactoresActividad;
}

export interface Snapshot {
  /** ISO, momento del fetch (Europe/Madrid). */
  ts: string;
  meteo: MeteoSnapshot;
  hidro: HidroSnapshot;
  solunar: SolunarSnapshot;
  veda: VedaEstado[];
  /** Índice de actividad calculado (proxy para el dataset de predicción). */
  actividad?: Actividad;
  /**
   * Secciones cuyo valor se ha reutilizado del último snapshot bueno porque la fuente
   * falló en este ciclo (resiliencia, CLAUDE.md §7). Vacío/ausente = todo fresco.
   */
  stale?: SeccionSnapshot[];
}

/** Constantes de un embalse (`config/sites.json`). */
export interface SiteConfig {
  /** Identificador en URL y rutas de datos (data/<slug>/…). */
  slug: string;
  nombre: string;
  lat: number;
  lon: number;
  capacidad_hm3: number;
  rio: string;
  cuenca: string;
  confederacion: string;
  municipio_presa?: string;
  provincia?: string;
  /** Comunidad autónoma: decide si aplica la veda parseada (solo "Madrid"). */
  comunidad: string;
  embalsesnet_id?: number;
  /** Estación SAIH del embalse: token `x` + coords reales (distintas del centro del vaso). */
  saih?: { estacion: string; token: string; lat: number; lon: number; z_msnm: number };
  /** Avisos de veda/zona específicos del embalse (Anexo VIII/X). */
  avisos?: string[];
  timezone: string;
}
