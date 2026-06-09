import { describe, it, expect } from "vitest";
import { zonasSchema, colorPorTipo, etiquetaTipo } from "./zonas";
import { getZonas } from "./store";

describe("zonas", () => {
  it("colorPorTipo y etiquetaTipo cubren los tres tipos", () => {
    expect(colorPorTipo("vedado")).toMatch(/^#/);
    expect(colorPorTipo("captura_suelta")).toMatch(/^#/);
    expect(colorPorTipo("sector")).toMatch(/^#/);
    expect(etiquetaTipo("vedado")).toBe("Vedado");
  });

  it("el GeoJSON de San Juan valida y trae zonas oficiales", async () => {
    const z = await getZonas("san-juan");
    expect(z).not.toBeNull();
    expect(z!.type).toBe("FeatureCollection");
    expect(z!.features.length).toBeGreaterThanOrEqual(3);
    const tipos = z!.features.map((f) => f.properties.tipo);
    expect(tipos).toContain("vedado");
    expect(tipos).toContain("captura_suelta");
  });

  it("rechaza un GeoJSON con tipo inválido", () => {
    const bad = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { nombre: "x", tipo: "zona-rara" },
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [1, 0], [0, 0]]] },
        },
      ],
    };
    expect(zonasSchema.safeParse(bad).success).toBe(false);
  });

  it("getZonas devuelve null para un slug sin fichero", async () => {
    expect(await getZonas("no-existe")).toBeNull();
  });
});
