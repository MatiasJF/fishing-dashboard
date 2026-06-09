import { z } from "zod";
import type { MeteoSnapshot, SourceResult } from "../types";
import { pressureDeltas } from "../pressure";
import { nowMadridISO } from "../tz";

/**
 * Fuente meteo PRIMARIA: Open-Meteo (sin API key, CLAUDE.md §4.1).
 * Pide `past_days=2` para poder calcular los deltas de presión hacia atrás.
 * Por contrato NUNCA lanza: devuelve SourceResult.
 */

const SOURCE = "openmeteo";

const responseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    pressure_msl: z.number(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number(),
    wind_gusts_10m: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    pressure_msl: z.array(z.number()),
  }),
});

export function buildUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover",
    hourly: "pressure_msl",
    past_days: "2",
    forecast_days: "1",
    timezone: "Europe/Madrid",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export async function getOpenMeteo(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch
): Promise<SourceResult<MeteoSnapshot>> {
  try {
    const res = await fetchImpl(buildUrl(lat, lon));
    if (!res.ok) {
      return { ok: false, error: `Open-Meteo HTTP ${res.status}` };
    }
    const json = await res.json();
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: `Open-Meteo respuesta inválida: ${parsed.error.message}` };
    }

    const { current, hourly } = parsed.data;
    const { delta24h, delta48h } = pressureDeltas(
      hourly.time,
      hourly.pressure_msl,
      current.time,
      current.pressure_msl
    );

    const fetched_at = nowMadridISO();
    const reading = <T>(value: T) => ({ value, source: SOURCE, fetched_at });

    const data: MeteoSnapshot = {
      temp_c: reading(current.temperature_2m),
      humedad_pct: reading(current.relative_humidity_2m),
      presion_hpa: reading(current.pressure_msl),
      presion_delta_24h: reading(delta24h),
      presion_delta_48h: reading(delta48h),
      viento_kmh: reading(current.wind_speed_10m),
      viento_dir_deg: reading(current.wind_direction_10m),
      rachas_kmh: reading(current.wind_gusts_10m),
    };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
