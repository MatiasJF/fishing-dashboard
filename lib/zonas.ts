import { z } from "zod";

/**
 * Zonas de pesca dibujables en el mapa (GeoJSON). Pueden ser oficiales (vedado / captura y
 * suelta, de la Orden de vedas) o sectores curados por el usuario. Geometría aproximada
 * salvo que se refine con una fuente GIS.
 */

export type TipoZona = "vedado" | "captura_suelta" | "sector" | "embalse";

const posicion = z.tuple([z.number(), z.number()]); // [lon, lat]

const featureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    nombre: z.string(),
    tipo: z.enum(["vedado", "captura_suelta", "sector", "embalse"]),
    color: z.string().optional(),
    nota: z.string().optional(),
  }),
  geometry: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(posicion)),
  }),
});

export const zonasSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(featureSchema),
});

export type ZonasFeatureCollection = z.infer<typeof zonasSchema>;

/** Color por defecto según el tipo (un `color` en properties lo sobreescribe). */
export function colorPorTipo(tipo: TipoZona): string {
  switch (tipo) {
    case "vedado":
      return "#dc2626"; // rojo
    case "captura_suelta":
      return "#0ea5e9"; // azul
    case "sector":
      return "#16a34a"; // verde
    case "embalse":
      return "#0d9488"; // teal (contorno informativo del vaso)
  }
}

/** Etiqueta legible del tipo de zona. */
export function etiquetaTipo(tipo: TipoZona): string {
  return {
    vedado: "Vedado",
    captura_suelta: "Captura y suelta",
    sector: "Sector",
    embalse: "Embalse",
  }[tipo];
}
