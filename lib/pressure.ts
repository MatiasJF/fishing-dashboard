/**
 * Cálculo de los deltas de presión 24/48 h (indicador de frente barométrico).
 * Función pura sobre los arrays `hourly` de Open-Meteo (CLAUDE.md §4.1).
 *
 * IMPORTANTE: el array `hourly` debe incluir las horas PASADAS (Open-Meteo necesita
 * `past_days=2`), si no, no hay con qué comparar hacia atrás.
 */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Índice en `times` de la hora en curso. `times` son cadenas "YYYY-MM-DDTHH:00".
 * `currentTime` puede traer minutos ("...T13:15"); se trunca a la hora.
 */
export function findHourIndex(times: string[], currentTime: string): number {
  const targetHour = currentTime.slice(0, 13) + ":00";
  const exact = times.indexOf(targetHour);
  if (exact !== -1) return exact;
  // Fallback: última hora no posterior al instante actual.
  return times.findLastIndex((t) => t <= currentTime);
}

export interface PressureDeltas {
  delta24h: number;
  delta48h: number;
}

/**
 * delta = presión actual − presión hace N horas. Si no hay histórico suficiente
 * para una ventana, ese delta vale 0 (no se inventa tendencia).
 */
export function pressureDeltas(
  times: string[],
  pressures: number[],
  currentTime: string,
  currentPressure: number
): PressureDeltas {
  const idx = findHourIndex(times, currentTime);
  const at = (hoursBack: number): number | null => {
    if (idx < 0) return null;
    const j = idx - hoursBack;
    return j >= 0 && j < pressures.length ? pressures[j] : null;
  };
  const p24 = at(24);
  const p48 = at(48);
  return {
    delta24h: p24 === null ? 0 : round1(currentPressure - p24),
    delta48h: p48 === null ? 0 : round1(currentPressure - p48),
  };
}
