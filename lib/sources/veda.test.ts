import { describe, it, expect } from "vitest";
import { getVeda } from "./veda";

const config = {
  especies: [
    { id: "verano", nombre: "Especie verano", vedas: [{ desde: "05-15", hasta: "06-30" }] },
    { id: "invierno", nombre: "Especie invierno", vedas: [{ desde: "12-01", hasta: "02-15" }] },
    { id: "libre", nombre: "Especie libre", vedas: [] },
  ],
};

describe("getVeda", () => {
  it("marca veda dentro del periodo y hábil fuera", () => {
    const r = getVeda(new Date("2026-06-09T10:00:00Z"), config);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const verano = r.data.find((e) => e.especie === "Especie verano");
    expect(verano?.estado).toBe("veda");

    const enero = getVeda(new Date("2026-01-09T10:00:00Z"), config);
    if (!enero.ok) return;
    expect(enero.data.find((e) => e.especie === "Especie verano")?.estado).toBe("habil");
  });

  it("soporta periodos que cruzan el fin de año", () => {
    // Especie invierno: vedada de 12-01 a 02-15.
    const r1 = getVeda(new Date("2026-01-20T10:00:00Z"), config);
    const r2 = getVeda(new Date("2026-03-20T10:00:00Z"), config);
    if (!r1.ok || !r2.ok) throw new Error("config inválida");
    expect(r1.data.find((e) => e.especie === "Especie invierno")?.estado).toBe("veda");
    expect(r2.data.find((e) => e.especie === "Especie invierno")?.estado).toBe("habil");
  });

  it("especie sin vedas siempre hábil", () => {
    const r = getVeda(new Date("2026-06-09T10:00:00Z"), config);
    if (!r.ok) return;
    expect(r.data.find((e) => e.especie === "Especie libre")?.estado).toBe("habil");
  });

  it("falla limpiamente con config inválida", () => {
    const r = getVeda(new Date(), { especies: [{ nombre: 123 }] });
    expect(r.ok).toBe(false);
  });

  it("valida la config real de config/veda.json", () => {
    const r = getVeda(new Date("2026-06-09T10:00:00Z"));
    expect(r.ok).toBe(true);
  });
});
