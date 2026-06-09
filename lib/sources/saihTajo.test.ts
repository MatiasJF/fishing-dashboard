import { describe, it, expect } from "vitest";
import { mapSaih, getSaih, parseSaihTiempo } from "./saihTajo";

// Estructura real de la respuesta de San Juan (E_19), recortada.
const payload = {
  response: {
    ok: 1,
    codigo: "E_19",
    nombre: "SAN JUAN",
    senales: [
      { nombre: "CAUDAL TOTAL DE SALIDA AL RIO", unidad: "m3/s", last: { valor: 0, tiempo: "09/06/2026 13:00" } },
      { nombre: "COTA EMBALSE", unidad: "m", last: { valor: 577.69, tiempo: "09/06/2026 13:00" } },
      { nombre: "NIVEL EMBALSE", unidad: "m", last: { valor: 52.43, tiempo: "09/06/2026 13:00" } },
      { nombre: "VOLUMEN EMBALSE", unidad: "hm3", last: { valor: 123.23, tiempo: "09/06/2026 13:00" } },
      { nombre: "VOLUMEN PORCENTUAL", unidad: "%", last: { valor: 89.47, tiempo: "09/06/2026 13:00" } },
    ],
  },
};

describe("parseSaihTiempo", () => {
  it("convierte 'DD/MM/YYYY HH:mm' (Madrid) a ISO con offset", () => {
    expect(parseSaihTiempo("09/06/2026 13:00")).toBe("2026-06-09T13:00:00+02:00");
    expect(parseSaihTiempo("15/01/2026 08:00")).toBe("2026-01-15T08:00:00+01:00");
    expect(parseSaihTiempo(undefined)).toBeUndefined();
  });
});

describe("mapSaih", () => {
  it("mapea las señales reales a HidroData", () => {
    const r = mapSaih(payload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.volumen_hm3).toBe(123.23);
    expect(r.data.llenado_pct).toBe(89.47);
    expect(r.data.nivel_msnm).toBe(577.69); // COTA EMBALSE, no NIVEL
    expect(r.data.caudal_salida_m3s).toBe(0);
    expect(r.data.caudal_entrada_m3s).toBeUndefined();
    expect(r.data.source).toBe("saih");
    expect(r.data.fecha_dato).toBe("2026-06-09T13:00:00+02:00");
  });

  it("deriva el % a partir del volumen y la capacidad si falta", () => {
    const sinPct = {
      response: {
        senales: [{ nombre: "VOLUMEN EMBALSE", unidad: "hm3", last: { valor: 69, tiempo: "09/06/2026 13:00" } }],
      },
    };
    const r = mapSaih(sinPct, 138);
    if (!r.ok) throw new Error("debería mapear");
    expect(r.data.llenado_pct).toBeCloseTo(50, 1);
  });

  it("ok:false si faltan volumen y porcentaje", () => {
    const soloCaudal = {
      response: { senales: [{ nombre: "CAUDAL TOTAL DE SALIDA AL RIO", unidad: "m3/s", last: { valor: 0 } }] },
    };
    expect(mapSaih(soloCaudal).ok).toBe(false);
  });

  it("ok:false ante payload inválido", () => {
    expect(mapSaih({ foo: 1 }).ok).toBe(false);
  });
});

describe("getSaih", () => {
  it("ok:false si no hay endpoint configurado", async () => {
    const r = await getSaih(undefined);
    expect(r.ok).toBe(false);
  });
});
