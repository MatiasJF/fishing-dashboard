import { z } from "zod";
import type { SourceResult } from "../types";
import { madridYMD } from "../tz";

/**
 * Fuente meteo AEMET OpenData (OFICIAL, opcional, CLAUDE.md §4.2).
 * Capa de CONTRASTE: si falla o no hay API key, no rompe (Open-Meteo manda).
 *
 * Patrón en DOS pasos: la 1ª llamada devuelve un JSON con un campo `datos` que es la
 * URL real; hay que hacer una 2ª petición a esa URL para obtener los datos.
 */

const SOURCE = "aemet";

// INE de San Martín de Valdeiglesias (Madrid). Municipio de la presa.
export const MUNICIPIO_SAN_MARTIN = "28132";

const BASE = "https://opendata.aemet.es/opendata/api";

/** Paso 1: respuesta con la URL real de los datos. */
const step1Schema = z.object({
  estado: z.number().optional(),
  datos: z.string().url().optional(),
  descripcion: z.string().optional(),
});

/** Paso 2: predicción horaria por municipio (estructura acotada a lo que usamos). */
const step2Schema = z
  .array(
    z.object({
      prediccion: z.object({
        dia: z.array(
          z.object({
            fecha: z.string(),
            temperatura: z
              .array(z.object({ value: z.string(), periodo: z.string() }))
              .optional(),
          })
        ),
      }),
    })
  )
  .min(1);

export interface AemetContraste {
  /** Temperatura (°C) prevista para la hora en curso, si está disponible. */
  temp_c: number | null;
  periodo: string;
  source: string;
}

export async function getAemet(
  apiKey: string | undefined,
  municipio: string = MUNICIPIO_SAN_MARTIN,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date()
): Promise<SourceResult<AemetContraste>> {
  if (!apiKey) {
    return { ok: false, error: "AEMET_API_KEY no configurada (capa de contraste omitida)" };
  }
  try {
    const url = `${BASE}/prediccion/especifica/municipio/horaria/${municipio}`;
    const res1 = await fetchImpl(url, { headers: { api_key: apiKey } });
    if (!res1.ok) return { ok: false, error: `AEMET paso 1 HTTP ${res1.status}` };

    const step1 = step1Schema.safeParse(await res1.json());
    if (!step1.success || !step1.data.datos) {
      return { ok: false, error: "AEMET paso 1 sin campo 'datos'" };
    }

    const res2 = await fetchImpl(step1.data.datos);
    if (!res2.ok) return { ok: false, error: `AEMET paso 2 HTTP ${res2.status}` };

    const step2 = step2Schema.safeParse(await res2.json());
    if (!step2.success) {
      return { ok: false, error: `AEMET paso 2 inválido: ${step2.error.message}` };
    }

    // Día y hora actuales en Madrid.
    const { year, month, day } = madridYMD(now);
    const fecha = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const horaActual = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now);

    const dia =
      step2.data[0].prediccion.dia.find((d) => d.fecha.startsWith(fecha)) ??
      step2.data[0].prediccion.dia[0];
    const t = dia.temperatura?.find((x) => x.periodo === horaActual);
    const temp_c = t ? Number(t.value) : null;

    return {
      ok: true,
      data: { temp_c: Number.isFinite(temp_c) ? temp_c : null, periodo: horaActual, source: SOURCE },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
