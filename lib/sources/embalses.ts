import type { SourceResult } from "../types";

/**
 * Hidrología FALLBACK: embalses.net / MITECO (CLAUDE.md §4.4).
 * Datos consolidados (≈ diarios), no frescos: respaldo del SAIH. CC BY 4.0 (atribuir).
 * Scraping de HTML estático. Por contrato NUNCA lanza.
 */

const SOURCE = "embalsesnet";

export interface HidroData {
  volumen_hm3: number;
  llenado_pct: number;
  nivel_msnm?: number;
  caudal_entrada_m3s?: number;
  caudal_salida_m3s?: number;
  /** Fecha del dato según la fuente (ISO), para evaluar frescura. */
  fecha_dato?: string;
  source: "saih" | "embalsesnet";
}

/** Convierte un número en formato español ("1.234,56", "92,03") a Number. */
export function parseEsNumber(s: string): number {
  return Number(s.trim().replace(/\./g, "").replace(",", "."));
}

function fechaEsToISO(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split("-");
  return `${y}-${m}-${d}`;
}

/**
 * Parser puro del HTML de la ficha. La etiqueta y los valores viven en `<div>`
 * separados, p. ej.:
 *   <strong>Agua embalsada (01-06-2026):</strong></div>
 *   <div class="Resultado"><strong>127</strong></div>
 *   <div class="Unidad"><strong>hm<sup>3</sup></strong></div>
 *   <div class="Resultado"><strong>92,03</strong></div>
 *   <div class="Unidad2"><strong>%</strong></div>
 * Por eso buscamos la fecha y luego, en la ventana siguiente sin etiquetas HTML,
 * el volumen (antes de "hm") y el porcentaje (antes de "%").
 */
export function parseEmbalses(html: string): SourceResult<HidroData> {
  const fecha = html.match(/Agua embalsada\s*\((\d{2}-\d{2}-\d{4})\)/i);
  if (!fecha) {
    return { ok: false, error: "embalses.net: no se encontró 'Agua embalsada'" };
  }
  const idx = html.indexOf(fecha[0]);
  const texto = html
    .slice(idx, idx + 400)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const vol = texto.match(/([\d.,]+)\s*hm/i);
  const pct = texto.match(/([\d.,]+)\s*%/);
  if (!vol || !pct) {
    return { ok: false, error: "embalses.net: no se pudieron extraer volumen/porcentaje" };
  }
  const volumen_hm3 = parseEsNumber(vol[1]);
  const llenado_pct = parseEsNumber(pct[1]);
  if (!Number.isFinite(volumen_hm3) || !Number.isFinite(llenado_pct)) {
    return { ok: false, error: "embalses.net: cifras no numéricas" };
  }
  return {
    ok: true,
    data: {
      volumen_hm3,
      llenado_pct,
      fecha_dato: fechaEsToISO(fecha[1]),
      source: SOURCE,
    },
  };
}

export async function getEmbalses(
  embalsesnetId: number | undefined,
  slug = "san-juan",
  fetchImpl: typeof fetch = fetch
): Promise<SourceResult<HidroData>> {
  if (!embalsesnetId) {
    return { ok: false, error: "embalses.net: sin embalsesnet_id configurado" };
  }
  try {
    const url = `https://www.embalses.net/pantano-${embalsesnetId}-${slug}.html`;
    const res = await fetchImpl(url, {
      headers: { "User-Agent": "san-juan-fishing-dashboard (datos CC BY 4.0)" },
    });
    if (!res.ok) return { ok: false, error: `embalses.net HTTP ${res.status}` };
    return parseEmbalses(await res.text());
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
