import { describe, it, expect } from "vitest";
import { recomendar, franjaDe, tendenciaDe } from "./recomendar";
import type { Snapshot } from "./types";

function snap(delta = 0): Snapshot {
  const r = <T>(value: T) => ({ value, source: "test", fetched_at: "2026-06-09T12:00:00+02:00" });
  return {
    ts: "2026-06-09T12:00:00+02:00",
    meteo: {
      temp_c: r(20), humedad_pct: r(50), presion_hpa: r(1015),
      presion_delta_24h: r(delta), presion_delta_48h: r(0),
      viento_kmh: r(10), viento_dir_deg: r(180), rachas_kmh: r(20),
    },
    hidro: { volumen_hm3: r(120), llenado_pct: r(87) },
    solunar: {
      fase_lunar: "x", fraccion_iluminada: 0.5,
      sol: { orto: "2026-06-09T07:00:00+02:00", ocaso: "2026-06-09T21:00:00+02:00" },
      luna: { orto: null, ocaso: null }, periodos: [],
    },
    veda: [],
  };
}

describe("franjaDe / tendenciaDe", () => {
  it("clasifica la franja por el sol", () => {
    expect(franjaDe(snap(), new Date("2026-06-09T05:30:00Z"))).toBe("amanecer"); // 07:30 Madrid
    expect(franjaDe(snap(), new Date("2026-06-09T10:00:00Z"))).toBe("dia"); // 12:00
    expect(franjaDe(snap(), new Date("2026-06-09T18:30:00Z"))).toBe("atardecer"); // 20:30
    expect(franjaDe(snap(), new Date("2026-06-09T23:30:00Z"))).toBe("noche"); // 01:30
  });
  it("clasifica la tendencia de presión", () => {
    expect(tendenciaDe(-2)).toBe("baja");
    expect(tendenciaDe(2)).toBe("sube");
    expect(tendenciaDe(0)).toBe("estable");
  });
});

describe("recomendar", () => {
  it("recomienda superficie para black bass en verano al atardecer", () => {
    const r = recomendar("Black bass", snap(), new Date("2026-06-09T18:30:00Z")); // junio, atardecer
    expect(r).not.toBeNull();
    expect(r!.especifica).toBe(true);
    expect(r!.tecnica.toLowerCase()).toContain("superficie");
    expect(r!.contexto.franja).toBe("atardecer");
  });

  it("usa fallback si ninguna regla casa", () => {
    // Lucio sólo tiene reglas que siempre casan (una con condiciones {}), probamos Barbo en invierno.
    const r = recomendar("Barbo común", snap(), new Date("2026-01-09T12:00:00Z"));
    expect(r).not.toBeNull();
    expect(r!.especifica).toBe(false);
    expect(r!.tecnica.toLowerCase()).toContain("fondo");
  });

  it("devuelve null para especie desconocida", () => {
    expect(recomendar("Tiburón", snap(), new Date())).toBeNull();
  });

  it("valida la config real de recomendaciones.json", () => {
    const r = recomendar("Carpa", snap(), new Date("2026-06-09T10:00:00Z"));
    expect(r).not.toBeNull();
    expect(r!.senuelo_cebo.length).toBeGreaterThan(0);
  });
});
