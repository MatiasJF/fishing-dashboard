import { z } from "zod";
import type { SourceResult, VedaEstado } from "../types";
import { madridYMD } from "../tz";
import vedaConfigRaw from "../../config/veda.json";

/**
 * Estado de veda por especie a partir de `config/veda.json` (CLAUDE.md §4.6).
 * No hay API: la config la mantiene el usuario cada temporada. Función pura.
 */

const periodoSchema = z.object({
  // MM-DD; un periodo con desde > hasta cruza el fin de año.
  desde: z.string().regex(/^\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{2}-\d{2}$/),
});

const especieSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  nombre_cientifico: z.string().optional(),
  vedas: z.array(periodoSchema),
  nota: z.string().optional(),
});

export const vedaConfigSchema = z.object({
  especies: z.array(especieSchema),
});

export type EspecieVeda = z.infer<typeof especieSchema>;

/** ¿Está `md` ("MM-DD") dentro del periodo [desde, hasta]? Soporta cruce de año. */
function dentro(md: string, desde: string, hasta: string): boolean {
  return desde <= hasta ? md >= desde && md <= hasta : md >= desde || md <= hasta;
}

export function getVeda(
  date: Date,
  config: unknown = vedaConfigRaw
): SourceResult<VedaEstado[]> {
  const parsed = vedaConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: `config/veda.json inválido: ${parsed.error.message}` };
  }

  const { month, day } = madridYMD(date);
  const md = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const estados: VedaEstado[] = parsed.data.especies.map((esp) => {
    const enVeda = esp.vedas.some((p) => dentro(md, p.desde, p.hasta));
    return {
      especie: esp.nombre,
      estado: enVeda ? "veda" : "habil",
      nota: esp.nota,
    };
  });

  return { ok: true, data: estados };
}
