import type { Actividad, FactoresActividad, Snapshot } from "./types";

/**
 * Índice de actividad pesquera (0-100), heurístico y orientativo. Combina factores que la
 * experiencia y la teoría solunar asocian a mayor actividad. Función PURA y testeable.
 * No es una predicción: es un proxy que además se guarda en el histórico (dataset).
 */

const PESOS = { solunar: 0.4, presion: 0.3, viento: 0.2, luna: 0.1 };

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Cercanía a un periodo solunar: máximo si estamos dentro; decae a ±90 min de los bordes. */
export function factorSolunar(snapshot: Snapshot, now: Date): number {
  const t = now.getTime();
  let mejor = 0;
  for (const p of snapshot.solunar.periodos) {
    const ini = new Date(p.inicio).getTime();
    const fin = new Date(p.fin).getTime();
    const base = p.tipo === "mayor" ? 100 : 75;
    if (t >= ini && t <= fin) {
      mejor = Math.max(mejor, base);
    } else {
      const dist = t < ini ? ini - t : t - fin;
      const mins = dist / 60000;
      if (mins <= 90) mejor = Math.max(mejor, base * (1 - mins / 90));
    }
  }
  return clamp(mejor);
}

/** Presión: una caída marca frente (más actividad); subida fuerte y estable, menos. */
export function factorPresion(delta24h: number): number {
  // delta -3 hPa → ~95; 0 → 50; +3 → ~5.
  return clamp(50 - delta24h * 15);
}

/** Viento: brisa moderada (≈12 km/h) es lo mejor; calma chicha y temporal penalizan. */
export function factorViento(kmh: number): number {
  if (kmh <= 0) return 45;
  if (kmh <= 12) return clamp(45 + (kmh / 12) * 55); // 45→100
  if (kmh <= 25) return clamp(100 - ((kmh - 12) / 13) * 45); // 100→55
  return clamp(55 - (kmh - 25) * 3, 10); // cae con rachas fuertes
}

/** Luna: nueva y llena suelen dar más actividad que los cuartos. */
export function factorLuna(fraccionIluminada: number): number {
  const distCuarto = Math.abs(fraccionIluminada - 0.5); // 0 en cuarto, 0.5 en nueva/llena
  return clamp(40 + distCuarto * 2 * 60); // cuarto 40 → nueva/llena 100
}

function etiquetaDe(score: number): Actividad["etiqueta"] {
  if (score < 35) return "baja";
  if (score < 55) return "moderada";
  if (score < 75) return "alta";
  return "muy alta";
}

export function computeActivityIndex(snapshot: Snapshot, now: Date): Actividad {
  const factores: FactoresActividad = {
    solunar: Math.round(factorSolunar(snapshot, now)),
    presion: Math.round(factorPresion(snapshot.meteo.presion_delta_24h.value)),
    viento: Math.round(factorViento(snapshot.meteo.viento_kmh.value)),
    luna: Math.round(factorLuna(snapshot.solunar.fraccion_iluminada)),
  };
  const score = Math.round(
    factores.solunar * PESOS.solunar +
      factores.presion * PESOS.presion +
      factores.viento * PESOS.viento +
      factores.luna * PESOS.luna
  );
  return { score, etiqueta: etiquetaDe(score), factores };
}
