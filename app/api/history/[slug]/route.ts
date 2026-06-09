import { getSite, readHistory } from "@/lib/store";
import {
  filtrarPorDias,
  downsample,
  snapshotsToSeries,
  seriesToCsv,
} from "@/lib/history";

/**
 * Histórico de un embalse. `?days=N` recorta el rango (def. 30). `?format=csv` descarga CSV.
 * JSON: serie ya muestreada (máx. ~600 puntos) lista para la gráfica.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getSite(slug)) {
    return new Response(JSON.stringify({ error: "embalse no encontrado" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const days = Math.max(1, Math.min(3650, Number(url.searchParams.get("days")) || 30));

  const todos = await readHistory(slug);
  const enRango = filtrarPorDias(todos, days, new Date());

  if (format === "csv") {
    return new Response(seriesToCsv(enRango), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${slug}-historico-${days}d.csv"`,
      },
    });
  }

  const serie = snapshotsToSeries(downsample(enRango, 600));
  return new Response(JSON.stringify({ slug, days, puntos: serie }), {
    headers: { "content-type": "application/json" },
  });
}
