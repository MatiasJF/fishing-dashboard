import { describe, it, expect } from "vitest";
import {
  filtrarPorDias,
  downsample,
  snapshotsToSeries,
  seriesToCsv,
} from "./history";
import type { Snapshot } from "./types";

function snap(ts: string, vol = 100, score = 50): Snapshot {
  const r = <T>(value: T) => ({ value, source: "saih", fetched_at: ts });
  return {
    ts,
    meteo: {
      temp_c: r(20), humedad_pct: r(50), presion_hpa: r(1015),
      presion_delta_24h: r(-1), presion_delta_48h: r(-2),
      viento_kmh: r(10), viento_dir_deg: r(180), rachas_kmh: r(20),
    },
    hidro: { volumen_hm3: r(vol), llenado_pct: r(vol / 1.38), nivel_msnm: r(577) },
    solunar: { fase_lunar: "x", fraccion_iluminada: 0.5, sol: { orto: ts, ocaso: ts }, luna: { orto: null, ocaso: null }, periodos: [] },
    veda: [],
    actividad: { score, etiqueta: "moderada", factores: { solunar: 0, presion: 0, viento: 0, luna: 0 } },
  };
}

describe("history", () => {
  it("filtrarPorDias recorta por antigüedad", () => {
    const now = new Date("2026-06-09T12:00:00+02:00");
    const snaps = [snap("2026-06-01T12:00:00+02:00"), snap("2026-06-08T12:00:00+02:00")];
    expect(filtrarPorDias(snaps, 3, now)).toHaveLength(1);
    expect(filtrarPorDias(snaps, 30, now)).toHaveLength(2);
  });

  it("downsample limita el nº de puntos e incluye el último", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    const ds = downsample(arr, 100);
    expect(ds.length).toBeLessThanOrEqual(101);
    expect(ds[ds.length - 1]).toBe(999);
    expect(downsample([1, 2, 3], 100)).toEqual([1, 2, 3]);
  });

  it("snapshotsToSeries extrae los campos clave", () => {
    const s = snapshotsToSeries([snap("2026-06-09T12:00:00+02:00", 120, 60)]);
    expect(s[0].volumen_hm3).toBe(120);
    expect(s[0].actividad).toBe(60);
    expect(s[0].presion_hpa).toBe(1015);
  });

  it("seriesToCsv produce cabecera + filas", () => {
    const csv = seriesToCsv([snap("2026-06-09T12:00:00+02:00", 120, 60)]);
    const lineas = csv.trim().split("\n");
    expect(lineas[0]).toContain("ts,volumen_hm3");
    expect(lineas[0]).toContain("actividad");
    expect(lineas[1]).toContain("120");
    expect(lineas[1]).toContain("60");
  });
});
