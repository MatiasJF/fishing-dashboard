import { describe, it, expect, vi } from "vitest";
import { getAemet } from "./aemet";

const DATOS_URL = "https://opendata.aemet.es/opendata/sh/datos-123";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

describe("getAemet", () => {
  it("omite la fuente si no hay API key", async () => {
    const r = await getAemet(undefined);
    expect(r.ok).toBe(false);
  });

  it("sigue el patrón de dos pasos y extrae la temperatura de la hora actual", async () => {
    // now = 9 jun 2026 12:30 UTC → 14:30 Madrid → periodo "14".
    const now = new Date("2026-06-09T12:30:00Z");
    const step2 = [
      {
        prediccion: {
          dia: [
            {
              fecha: "2026-06-09T00:00:00",
              temperatura: [
                { value: "20", periodo: "13" },
                { value: "27", periodo: "14" },
                { value: "26", periodo: "15" },
              ],
            },
          ],
        },
      },
    ];

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ estado: 200, datos: DATOS_URL }))
      .mockResolvedValueOnce(jsonResponse(step2));

    const r = await getAemet("KEY", "28132", fetchImpl as unknown as typeof fetch, now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.periodo).toBe("14");
    expect(r.data.temp_c).toBe(27);

    // Paso 1 con header api_key; paso 2 a la URL de 'datos'.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1]).toEqual({ headers: { api_key: "KEY" } });
    expect(fetchImpl.mock.calls[1][0]).toBe(DATOS_URL);
  });

  it("ok:false si el paso 1 no trae 'datos'", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ estado: 404 }));
    const r = await getAemet("KEY", "28132", fetchImpl as unknown as typeof fetch);
    expect(r.ok).toBe(false);
  });
});
