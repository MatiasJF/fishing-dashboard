import Link from "next/link";
import { getSites, readLatest } from "@/lib/store";
import { num } from "@/lib/display";
import { SourceFooter } from "@/components/SourceFooter";

export const revalidate = 900;

const ETIQUETA_COLOR: Record<string, string> = {
  baja: "text-zinc-500",
  moderada: "text-amber-500",
  alta: "text-lime-600 dark:text-lime-400",
  "muy alta": "text-emerald-600 dark:text-emerald-400",
};

export default async function Home() {
  const sites = getSites();
  const tarjetas = await Promise.all(
    sites.map(async (s) => ({ site: s, snapshot: await readLatest(s.slug) }))
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Embalses · Pesca</h1>
        <p className="text-sm text-zinc-500">
          Condiciones para planificar jornadas de pesca. Elige un embalse.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map(({ site, snapshot }) => {
          const pct = snapshot?.hidro.llenado_pct.value;
          const act = snapshot?.actividad;
          return (
            <Link
              key={site.slug}
              href={`/embalse/${site.slug}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-400 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold">{site.nombre}</h2>
              <p className="text-xs text-zinc-500">
                Río {site.rio}{site.provincia ? ` · ${site.provincia}` : ""}
              </p>

              {snapshot ? (
                <>
                  {pct !== undefined && (
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-sm">
                        <span className="font-semibold tabular-nums">{num(pct, 1)} %</span>{" "}
                        <span className="text-zinc-500">llenado</span>
                      </p>
                    </div>
                  )}
                  {act && (
                    <p className="mt-2 text-sm">
                      Actividad{" "}
                      <span className={`font-semibold ${ETIQUETA_COLOR[act.etiqueta] ?? ""}`}>
                        {act.score}/100 · {act.etiqueta}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">Sin datos todavía</p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <SourceFooter />
      </div>
    </main>
  );
}
