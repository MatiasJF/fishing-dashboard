/**
 * Helpers de presentación (formateo para la UI). Puros, sin estado.
 * Los ISO almacenados ya llevan la hora local de Madrid con su offset,
 * así que para mostrar basta con extraer los componentes de la cadena.
 */

/** "HH:mm" a partir de un ISO de Madrid; "—" si es null. */
export function hora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(11, 16) || "—";
}

/** "DD/MM" a partir de un ISO o fecha "YYYY-MM-DD". */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** Número con formato español y nº de decimales fijo. */
export function num(value: number, decimales = 0): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

const RUMBOS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

/** Grados → rumbo de la rosa de los vientos (16 sectores). */
export function rumbo(deg: number): string {
  return RUMBOS[Math.round(((deg % 360) / 22.5)) % 16];
}

export interface TendenciaPresion {
  etiqueta: string;
  flecha: "↑" | "↓" | "→";
  /** Pista de pesca asociada al cambio barométrico. */
  pista: string;
  tono: "alza" | "baja" | "estable";
}

/**
 * Interpreta el delta de presión (hPa). Una caída marcada suele anunciar un frente
 * (a menudo buena actividad justo antes); una presión alta y estable, jornada lenta.
 */
export function tendenciaPresion(delta: number): TendenciaPresion {
  if (delta <= -1.5) {
    return { etiqueta: "Bajando", flecha: "↓", pista: "Posible frente: actividad al alza", tono: "baja" };
  }
  if (delta >= 1.5) {
    return { etiqueta: "Subiendo", flecha: "↑", pista: "Estabilización tras frente", tono: "alza" };
  }
  return { etiqueta: "Estable", flecha: "→", pista: "Sin cambios de frente", tono: "estable" };
}

/** Etiqueta legible de la fuente. */
export function fuenteLabel(source: string): string {
  const map: Record<string, string> = {
    openmeteo: "Open-Meteo",
    aemet: "AEMET",
    saih: "SAIH Tajo",
    embalsesnet: "embalses.net",
    suncalc: "cálculo local",
    config: "config",
  };
  return map[source] ?? source;
}
