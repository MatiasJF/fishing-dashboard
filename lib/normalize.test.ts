import { describe, it, expect } from "vitest";
import { buildSnapshot, seleccionarHidro, type SourceInputs } from "./normalize";
import type { MeteoSnapshot, SolunarSnapshot, Snapshot, VedaEstado } from "./types";
import type { HidroData } from "./sources/embalses";

const TS = "2026-06-09T12:00:00+02:00";
const r = <T>(value: T) => ({ value, source: "test", fetched_at: TS });

const meteo: MeteoSnapshot = {
  temp_c: r(20),
  humedad_pct: r(50),
  presion_hpa: r(1015),
  presion_delta_24h: r(-2),
  presion_delta_48h: r(-5),
  viento_kmh: r(10),
  viento_dir_deg: r(180),
  rachas_kmh: r(20),
};
const solunar: SolunarSnapshot = {
  fase_lunar: "Luna llena",
  fraccion_iluminada: 1,
  sol: { orto: TS, ocaso: TS },
  luna: { orto: null, ocaso: null },
  periodos: [],
};
const veda: VedaEstado[] = [{ especie: "Black bass", estado: "habil" }];

const okInputs = (): SourceInputs => ({
  meteo: { ok: true, data: meteo },
  hidroSaih: { ok: false, error: "no endpoint" },
  hidroEmbalses: { ok: true, data: { volumen_hm3: 127, llenado_pct: 92, source: "embalsesnet" } },
  solunar: { ok: true, data: solunar },
  veda: { ok: true, data: veda },
});

const now = new Date("2026-06-09T10:00:00Z");

describe("seleccionarHidro", () => {
  const saih: HidroData = {
    volumen_hm3: 124,
    llenado_pct: 89.8,
    source: "saih",
    fecha_dato: "2026-06-09T11:55:00+02:00", // fresco (~5 min antes)
  };
  const embalses: HidroData = { volumen_hm3: 127, llenado_pct: 92, source: "embalsesnet" };

  it("prefiere SAIH si está fresco", () => {
    const d = seleccionarHidro({ ok: true, data: saih }, { ok: true, data: embalses }, now);
    expect(d?.source).toBe("saih");
  });

  it("degrada a embalses.net si SAIH está obsoleto", () => {
    const viejo: HidroData = { ...saih, fecha_dato: "2026-06-08T00:00:00+02:00" };
    const d = seleccionarHidro({ ok: true, data: viejo }, { ok: true, data: embalses }, now);
    expect(d?.source).toBe("embalsesnet");
  });

  it("null si ambas fuentes fallan", () => {
    const d = seleccionarHidro({ ok: false, error: "x" }, { ok: false, error: "y" }, now);
    expect(d).toBeNull();
  });
});

describe("buildSnapshot", () => {
  it("arma el Snapshot sin stale cuando todo va bien", () => {
    const s = buildSnapshot(okInputs(), null, now);
    expect(s.stale).toBeUndefined();
    expect(s.hidro.volumen_hm3.value).toBe(127);
    expect(s.hidro.volumen_hm3.source).toBe("embalsesnet");
  });

  it("reutiliza el valor previo y marca stale si una sección falla", () => {
    const previous: Snapshot = buildSnapshot(okInputs(), null, now);
    const inputs = okInputs();
    inputs.meteo = { ok: false, error: "Open-Meteo caído" };
    const s = buildSnapshot(inputs, previous, now);
    expect(s.stale).toContain("meteo");
    expect(s.meteo.temp_c.value).toBe(20); // del previo
  });

  it("lanza si falta una sección obligatoria y no hay valor previo", () => {
    const inputs = okInputs();
    inputs.meteo = { ok: false, error: "caído" };
    expect(() => buildSnapshot(inputs, null, now)).toThrow();
  });
});
