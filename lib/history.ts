import type { Snapshot } from "./types";

/**
 * Transformaciones puras del histórico (data/<slug>/history.jsonl) para gráficas y export.
 * Sin efectos: el route handler hace la E/S.
 */

export interface PuntoSerie {
  ts: string;
  volumen_hm3: number | null;
  llenado_pct: number | null;
  nivel_msnm: number | null;
  presion_hpa: number | null;
  presion_delta_24h: number | null;
  temp_c: number | null;
  viento_kmh: number | null;
  actividad: number | null;
}

/** Filtra por los últimos `days` días respecto a `now`. */
export function filtrarPorDias(snaps: Snapshot[], days: number, now: Date): Snapshot[] {
  const limite = now.getTime() - days * 24 * 60 * 60 * 1000;
  return snaps.filter((s) => {
    const t = new Date(s.ts).getTime();
    return !Number.isNaN(t) && t >= limite;
  });
}

/** Reduce el número de puntos a como mucho `max`, muestreando uniformemente. */
export function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const paso = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * paso)]);
  // Garantizar que incluimos el último punto (el más reciente).
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

export function snapshotsToSeries(snaps: Snapshot[]): PuntoSerie[] {
  return snaps.map((s) => ({
    ts: s.ts,
    volumen_hm3: s.hidro.volumen_hm3?.value ?? null,
    llenado_pct: s.hidro.llenado_pct?.value ?? null,
    nivel_msnm: s.hidro.nivel_msnm?.value ?? null,
    presion_hpa: s.meteo.presion_hpa?.value ?? null,
    presion_delta_24h: s.meteo.presion_delta_24h?.value ?? null,
    temp_c: s.meteo.temp_c?.value ?? null,
    viento_kmh: s.meteo.viento_kmh?.value ?? null,
    actividad: s.actividad?.score ?? null,
  }));
}

const CAMPOS_CSV: (keyof PuntoSerie)[] = [
  "ts",
  "volumen_hm3",
  "llenado_pct",
  "nivel_msnm",
  "presion_hpa",
  "presion_delta_24h",
  "temp_c",
  "viento_kmh",
  "actividad",
];

/** Serializa el histórico a CSV (cabecera + una fila por snapshot). */
export function seriesToCsv(snaps: Snapshot[]): string {
  const filas = snapshotsToSeries(snaps);
  const cabecera = CAMPOS_CSV.join(",");
  const lineas = filas.map((f) =>
    CAMPOS_CSV.map((c) => (f[c] === null || f[c] === undefined ? "" : String(f[c]))).join(",")
  );
  return [cabecera, ...lineas].join("\n") + "\n";
}
