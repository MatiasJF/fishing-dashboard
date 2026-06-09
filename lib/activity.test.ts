import { describe, it, expect } from "vitest";
import {
  computeActivityIndex,
  factorSolunar,
  factorPresion,
  factorViento,
  factorLuna,
} from "./activity";
import type { Snapshot } from "./types";

function snap(over: Partial<{ delta: number; viento: number; illum: number; periodos: Snapshot["solunar"]["periodos"] }> = {}): Snapshot {
  const r = <T>(value: T) => ({ value, source: "test", fetched_at: "2026-06-09T12:00:00+02:00" });
  return {
    ts: "2026-06-09T12:00:00+02:00",
    meteo: {
      temp_c: r(20),
      humedad_pct: r(50),
      presion_hpa: r(1015),
      presion_delta_24h: r(over.delta ?? 0),
      presion_delta_48h: r(0),
      viento_kmh: r(over.viento ?? 12),
      viento_dir_deg: r(180),
      rachas_kmh: r(20),
    },
    hidro: { volumen_hm3: r(120), llenado_pct: r(87) },
    solunar: {
      fase_lunar: "x",
      fraccion_iluminada: over.illum ?? 0.5,
      sol: { orto: "2026-06-09T07:00:00+02:00", ocaso: "2026-06-09T21:00:00+02:00" },
      luna: { orto: null, ocaso: null },
      periodos: over.periodos ?? [],
    },
    veda: [],
  };
}

describe("factores", () => {
  it("presión: caída sube el factor, subida lo baja", () => {
    expect(factorPresion(-3)).toBeGreaterThan(factorPresion(0));
    expect(factorPresion(0)).toBeGreaterThan(factorPresion(3));
    expect(factorPresion(0)).toBe(50);
  });
  it("viento: brisa moderada mejor que calma o temporal", () => {
    expect(factorViento(12)).toBeGreaterThan(factorViento(0));
    expect(factorViento(12)).toBeGreaterThan(factorViento(40));
  });
  it("luna: nueva/llena por encima de cuarto", () => {
    expect(factorLuna(0)).toBeGreaterThan(factorLuna(0.5));
    expect(factorLuna(1)).toBeGreaterThan(factorLuna(0.5));
  });
  it("solunar: dentro de un periodo mayor da 100", () => {
    const s = snap({
      periodos: [{ tipo: "mayor", inicio: "2026-06-09T11:30:00+02:00", fin: "2026-06-09T13:30:00+02:00" }],
    });
    expect(factorSolunar(s, new Date("2026-06-09T10:00:00Z"))).toBe(100); // 12:00 Madrid
  });
  it("solunar: lejos de cualquier periodo da 0", () => {
    const s = snap({
      periodos: [{ tipo: "mayor", inicio: "2026-06-09T03:00:00+02:00", fin: "2026-06-09T05:00:00+02:00" }],
    });
    expect(factorSolunar(s, new Date("2026-06-09T10:00:00Z"))).toBe(0);
  });
});

describe("computeActivityIndex", () => {
  it("devuelve score 0-100 y etiqueta coherente", () => {
    const a = computeActivityIndex(snap(), new Date("2026-06-09T10:00:00Z"));
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(["baja", "moderada", "alta", "muy alta"]).toContain(a.etiqueta);
  });

  it("mejores condiciones → mayor score", () => {
    const malo = computeActivityIndex(snap({ delta: 4, viento: 45, illum: 0.5 }), new Date("2026-06-09T10:00:00Z"));
    const bueno = computeActivityIndex(
      snap({
        delta: -3,
        viento: 12,
        illum: 1,
        periodos: [{ tipo: "mayor", inicio: "2026-06-09T11:30:00+02:00", fin: "2026-06-09T13:30:00+02:00" }],
      }),
      new Date("2026-06-09T10:00:00Z")
    );
    expect(bueno.score).toBeGreaterThan(malo.score);
  });
});
