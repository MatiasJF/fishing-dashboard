import SunCalc from "suncalc";
import type { SolunarSnapshot, SourceResult, PeriodoSolunar } from "../types";
import { madridStartOfDay, toMadridISO } from "../tz";

/**
 * Cálculo solunar LOCAL (sin red) con `suncalc` (CLAUDE.md §4.5).
 * Función pura: depende solo de (date, lat, lon). No toca disco ni red.
 */

/** Nombre en español de la fase lunar a partir de la fracción de fase [0,1) de suncalc. */
export function nombreFase(phase: number): string {
  // suncalc.phase: 0 = nueva, 0.25 = creciente, 0.5 = llena, 0.75 = menguante
  const fases: { max: number; nombre: string }[] = [
    { max: 0.0625, nombre: "Luna nueva" },
    { max: 0.1875, nombre: "Creciente iluminante" },
    { max: 0.3125, nombre: "Cuarto creciente" },
    { max: 0.4375, nombre: "Gibosa creciente" },
    { max: 0.5625, nombre: "Luna llena" },
    { max: 0.6875, nombre: "Gibosa menguante" },
    { max: 0.8125, nombre: "Cuarto menguante" },
    { max: 0.9375, nombre: "Creciente menguante" },
    { max: 1.0001, nombre: "Luna nueva" },
  ];
  return fases.find((f) => phase < f.max)!.nombre;
}

/**
 * Localiza el instante de máxima y mínima altitud lunar dentro del día natural (Madrid),
 * iterando `getMoonPosition`. Paso superior (máx) → periodo MAYOR; inferior (mín) → MENOR.
 */
function transitosLunares(
  date: Date,
  lat: number,
  lon: number
): { mayor: Date; menor: Date } {
  const start = madridStartOfDay(date).getTime();
  const stepMin = 5;
  let maxAlt = -Infinity;
  let minAlt = Infinity;
  let tMax = start;
  let tMin = start;
  for (let m = 0; m <= 24 * 60; m += stepMin) {
    const t = new Date(start + m * 60_000);
    const { altitude } = SunCalc.getMoonPosition(t, lat, lon);
    if (altitude > maxAlt) {
      maxAlt = altitude;
      tMax = t.getTime();
    }
    if (altitude < minAlt) {
      minAlt = altitude;
      tMin = t.getTime();
    }
  }
  return { mayor: new Date(tMax), menor: new Date(tMin) };
}

/** Construye un periodo centrado en `centro` con `durMin` minutos de duración total. */
function periodo(tipo: "mayor" | "menor", centro: Date, durMin: number): PeriodoSolunar {
  const half = (durMin * 60_000) / 2;
  return {
    tipo,
    inicio: toMadridISO(new Date(centro.getTime() - half)),
    fin: toMadridISO(new Date(centro.getTime() + half)),
  };
}

export function getSolunar(
  date: Date,
  lat: number,
  lon: number
): SourceResult<SolunarSnapshot> {
  try {
    const sun = SunCalc.getTimes(date, lat, lon);
    const moon = SunCalc.getMoonTimes(date, lat, lon);
    const illum = SunCalc.getMoonIllumination(date);
    const { mayor, menor } = transitosLunares(date, lat, lon);

    const data: SolunarSnapshot = {
      fase_lunar: nombreFase(illum.phase),
      fraccion_iluminada: Number(illum.fraction.toFixed(3)),
      sol: {
        orto: toMadridISO(sun.sunrise),
        ocaso: toMadridISO(sun.sunset),
      },
      luna: {
        orto: moon.rise ? toMadridISO(moon.rise) : null,
        ocaso: moon.set ? toMadridISO(moon.set) : null,
      },
      // Periodos solunares estándar: mayor ~2 h, menor ~1 h, centrados en el tránsito.
      periodos: [periodo("mayor", mayor, 120), periodo("menor", menor, 60)],
    };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
