/**
 * Utilidades de zona horaria. TODO en el proyecto se calcula y se muestra en
 * `Europe/Madrid` (CLAUDE.md §7), porque el runner de GitHub Actions corre en UTC.
 *
 * Trabajamos siempre con instantes (`Date`) y formateamos a ISO 8601 CON el offset
 * de Madrid (p. ej. `2026-06-09T15:00:00+02:00`), para que el dato sea inequívoco.
 */

export const TZ = "Europe/Madrid";

function pad(n: number): string {
  return String(Math.abs(n)).padStart(2, "0");
}

/**
 * Offset de la zona (en minutos) para un instante dado. Diferencia entre el mismo
 * instante interpretado como UTC y como hora local de la zona.
 */
export function offsetMinutes(date: Date, tz: string = TZ): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

/** Componentes de calendario (Y-M-D h:m:s) del instante en la zona indicada. */
function parts(date: Date, tz: string = TZ) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Formatea un instante a ISO 8601 con el offset de Europe/Madrid. */
export function toMadridISO(date: Date): string {
  const c = parts(date);
  const off = offsetMinutes(date);
  const sign = off >= 0 ? "+" : "-";
  const oh = pad(Math.trunc(off / 60));
  const om = pad(off % 60);
  return (
    `${c.year}-${pad(c.month)}-${pad(c.day)}` +
    `T${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}${sign}${oh}:${om}`
  );
}

/** Instante actual formateado como ISO de Madrid. */
export function nowMadridISO(): string {
  return toMadridISO(new Date());
}

/** Año-mes-día (en Madrid) del instante, útil para cálculos de calendario. */
export function madridYMD(date: Date): { year: number; month: number; day: number } {
  const c = parts(date);
  return { year: c.year, month: c.month, day: c.day };
}

/**
 * Instante correspondiente a las 00:00:00 (hora de Madrid) del día natural de `date`.
 * Sirve de base para iterar a lo largo del día local (cálculo solunar).
 */
export function madridStartOfDay(date: Date): Date {
  const { year, month, day } = madridYMD(date);
  const off = offsetMinutes(date);
  const sign = off >= 0 ? "+" : "-";
  const iso = `${year}-${pad(month)}-${pad(day)}T00:00:00${sign}${pad(
    Math.trunc(off / 60)
  )}:${pad(off % 60)}`;
  return new Date(iso);
}
