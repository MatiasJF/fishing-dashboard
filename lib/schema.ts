import { z } from "zod";

/**
 * Esquema zod del `Snapshot`. Se usa para validar lo que se escribe/lee en
 * `data/latest.json` y como guardarraíl en los tests. Debe mantenerse alineado
 * con las interfaces de `lib/types.ts`.
 */

const readingNumber = z.object({
  value: z.number(),
  source: z.string(),
  fetched_at: z.string(),
});

export const meteoSchema = z.object({
  temp_c: readingNumber,
  humedad_pct: readingNumber,
  presion_hpa: readingNumber,
  presion_delta_24h: readingNumber,
  presion_delta_48h: readingNumber,
  viento_kmh: readingNumber,
  viento_dir_deg: readingNumber,
  rachas_kmh: readingNumber,
});

export const hidroSchema = z.object({
  nivel_msnm: readingNumber.optional(),
  volumen_hm3: readingNumber,
  llenado_pct: readingNumber,
  caudal_entrada_m3s: readingNumber.optional(),
  caudal_salida_m3s: readingNumber.optional(),
});

export const solunarSchema = z.object({
  fase_lunar: z.string(),
  fraccion_iluminada: z.number(),
  sol: z.object({ orto: z.string(), ocaso: z.string() }),
  luna: z.object({ orto: z.string().nullable(), ocaso: z.string().nullable() }),
  periodos: z.array(
    z.object({
      tipo: z.enum(["mayor", "menor"]),
      inicio: z.string(),
      fin: z.string(),
    })
  ),
});

export const vedaSchema = z.array(
  z.object({
    especie: z.string(),
    estado: z.enum(["habil", "veda"]),
    nota: z.string().optional(),
  })
);

export const actividadSchema = z.object({
  score: z.number(),
  etiqueta: z.enum(["baja", "moderada", "alta", "muy alta"]),
  factores: z.object({
    solunar: z.number(),
    presion: z.number(),
    viento: z.number(),
    luna: z.number(),
  }),
});

export const snapshotSchema = z.object({
  ts: z.string(),
  meteo: meteoSchema,
  hidro: hidroSchema,
  solunar: solunarSchema,
  veda: vedaSchema,
  actividad: actividadSchema.optional(),
  stale: z.array(z.enum(["meteo", "hidro", "solunar", "veda"])).optional(),
});
