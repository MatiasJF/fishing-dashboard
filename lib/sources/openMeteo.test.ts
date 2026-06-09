import { describe, it, expect } from "vitest";
import { getOpenMeteo, buildUrl } from "./openMeteo";

function fakeFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
    }) as Response) as typeof fetch;
}

const times = Array.from({ length: 49 }, (_, i) =>
  new Date(new Date("2026-06-07T00:00:00Z").getTime() + i * 3600_000)
    .toISOString()
    .slice(0, 16)
);
const validBody = {
  current: {
    time: times[48],
    temperature_2m: 24.5,
    relative_humidity_2m: 40,
    surface_pressure: 918,
    pressure_msl: 1018,
    wind_speed_10m: 12,
    wind_direction_10m: 200,
    wind_gusts_10m: 25,
  },
  hourly: {
    time: times,
    pressure_msl: times.map((_, i) => 1000 + i),
  },
};

describe("buildUrl", () => {
  it("incluye past_days=2 para el delta hacia atrás", () => {
    expect(buildUrl(40.333, -4.333)).toContain("past_days=2");
  });
});

describe("getOpenMeteo", () => {
  it("normaliza la respuesta y calcula deltas", async () => {
    const r = await getOpenMeteo(40.333, -4.333, fakeFetch(validBody));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.temp_c.value).toBe(24.5);
    expect(r.data.presion_hpa.value).toBe(1018);
    expect(r.data.presion_delta_24h.value).toBe(1018 - 1024); // -6
    expect(r.data.rachas_kmh.value).toBe(25);
    expect(r.data.temp_c.source).toBe("openmeteo");
  });

  it("devuelve ok:false ante HTTP de error", async () => {
    const r = await getOpenMeteo(40.333, -4.333, fakeFetch({}, false, 500));
    expect(r.ok).toBe(false);
  });

  it("devuelve ok:false ante JSON inválido", async () => {
    const r = await getOpenMeteo(40.333, -4.333, fakeFetch({ foo: "bar" }));
    expect(r.ok).toBe(false);
  });
});
