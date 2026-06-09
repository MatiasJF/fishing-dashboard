import { z } from "zod";
import type { Snapshot } from "./types";
import { madridYMD } from "./tz";
import recomendacionesRaw from "../config/recomendaciones.json";

/**
 * Recomendación de técnica/cebo por especie según el momento y las condiciones.
 * Heurística curada en config/recomendaciones.json. Función PURA.
 */

export type Franja = "amanecer" | "dia" | "atardecer" | "noche";
export type Tendencia = "sube" | "baja" | "estable";

const reglaSchema = z.object({
  condiciones: z.object({
    meses: z.array(z.number()).optional(),
    franja: z.array(z.enum(["amanecer", "dia", "atardecer", "noche"])).optional(),
    presion: z.enum(["sube", "baja", "estable"]).optional(),
    actividad_min: z.number().optional(),
  }),
  tecnica: z.string(),
  senuelo_cebo: z.string(),
  profundidad: z.string(),
  nota: z.string().optional(),
});

const consejoSchema = z.object({
  tecnica: z.string(),
  senuelo_cebo: z.string(),
  profundidad: z.string(),
  nota: z.string().optional(),
});

const especieSchema = z.object({
  general: z.string(),
  reglas: z.array(reglaSchema).default([]),
  fallback: consejoSchema,
});

export const recomendacionesSchema = z.object({
  especies: z.record(z.string(), especieSchema),
});

export interface Recomendacion {
  especie: string;
  general: string;
  tecnica: string;
  senuelo_cebo: string;
  profundidad: string;
  nota?: string;
  /** true si casó una regla específica; false si se usó el fallback. */
  especifica: boolean;
  contexto: { franja: Franja; presion: Tendencia };
}

/** Franja del día según el orto/ocaso del sol del snapshot (todo en hora local de Madrid). */
export function franjaDe(snapshot: Snapshot, now: Date): Franja {
  const t = now.getTime();
  const orto = new Date(snapshot.solunar.sol.orto).getTime();
  const ocaso = new Date(snapshot.solunar.sol.ocaso).getTime();
  const h = 60 * 60000;
  if (t >= orto - 0.5 * h && t <= orto + 1.5 * h) return "amanecer";
  if (t >= ocaso - 1.5 * h && t <= ocaso + 0.5 * h) return "atardecer";
  if (t > orto + 1.5 * h && t < ocaso - 1.5 * h) return "dia";
  return "noche";
}

export function tendenciaDe(delta24h: number): Tendencia {
  if (delta24h <= -1.5) return "baja";
  if (delta24h >= 1.5) return "sube";
  return "estable";
}

export function recomendar(
  especie: string,
  snapshot: Snapshot,
  now: Date,
  config: unknown = recomendacionesRaw
): Recomendacion | null {
  const parsed = recomendacionesSchema.safeParse(config);
  if (!parsed.success) return null;
  const esp = parsed.data.especies[especie];
  if (!esp) return null;

  const franja = franjaDe(snapshot, now);
  const presion = tendenciaDe(snapshot.meteo.presion_delta_24h.value);
  const mes = madridYMD(now).month;
  const score = snapshot.actividad?.score ?? 0;

  const casa = esp.reglas.find((r) => {
    const c = r.condiciones;
    if (c.meses && !c.meses.includes(mes)) return false;
    if (c.franja && !c.franja.includes(franja)) return false;
    if (c.presion && c.presion !== presion) return false;
    if (c.actividad_min !== undefined && score < c.actividad_min) return false;
    return true;
  });

  const consejo = casa ?? esp.fallback;
  return {
    especie,
    general: esp.general,
    tecnica: consejo.tecnica,
    senuelo_cebo: consejo.senuelo_cebo,
    profundidad: consejo.profundidad,
    nota: consejo.nota,
    especifica: Boolean(casa),
    contexto: { franja, presion },
  };
}
