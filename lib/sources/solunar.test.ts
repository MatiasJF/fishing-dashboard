import { describe, it, expect } from "vitest";
import { getSolunar, nombreFase } from "./solunar";

// Embalse de San Juan (config/site.json)
const LAT = 40.333;
const LON = -4.333;

describe("nombreFase", () => {
  it("mapea fases clave al nombre español", () => {
    expect(nombreFase(0)).toBe("Luna nueva");
    expect(nombreFase(0.25)).toBe("Cuarto creciente");
    expect(nombreFase(0.5)).toBe("Luna llena");
    expect(nombreFase(0.75)).toBe("Cuarto menguante");
    expect(nombreFase(0.999)).toBe("Luna nueva");
  });
});

describe("getSolunar", () => {
  const r = getSolunar(new Date("2026-06-09T10:00:00Z"), LAT, LON);

  it("devuelve ok con la estructura esperada", () => {
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(typeof r.data.fase_lunar).toBe("string");
    expect(r.data.fraccion_iluminada).toBeGreaterThanOrEqual(0);
    expect(r.data.fraccion_iluminada).toBeLessThanOrEqual(1);
  });

  it("el orto del sol es anterior al ocaso", () => {
    if (!r.ok) return;
    expect(new Date(r.data.sol.orto).getTime()).toBeLessThan(
      new Date(r.data.sol.ocaso).getTime()
    );
  });

  it("incluye un periodo mayor (~2 h) y uno menor (~1 h)", () => {
    if (!r.ok) return;
    expect(r.data.periodos).toHaveLength(2);
    const mayor = r.data.periodos.find((p) => p.tipo === "mayor")!;
    const menor = r.data.periodos.find((p) => p.tipo === "menor")!;
    const durMayor =
      (new Date(mayor.fin).getTime() - new Date(mayor.inicio).getTime()) / 60000;
    const durMenor =
      (new Date(menor.fin).getTime() - new Date(menor.inicio).getTime()) / 60000;
    expect(durMayor).toBe(120);
    expect(durMenor).toBe(60);
  });
});
