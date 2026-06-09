import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite, getSites, getZonas, readLatest } from "@/lib/store";
import { hora, fechaCorta, rumbo } from "@/lib/display";
import { BarometricCard } from "@/components/BarometricCard";
import { WindCard, TempCard } from "@/components/WindCard";
import { HydroCard } from "@/components/HydroCard";
import { SolunarCard } from "@/components/SolunarCard";
import { ActivityCard } from "@/components/ActivityCard";
import { EspeciePanel } from "@/components/EspeciePanel";
import { recomendar } from "@/lib/recomendar";
import { ReadingsTable } from "@/components/ReadingsTable";
import { HistoryChart } from "@/components/HistoryChart";
import { MapClient } from "@/components/MapClient";
import { StaleBanner } from "@/components/StaleBanner";
import { SourceFooter } from "@/components/SourceFooter";

export const revalidate = 900;

export function generateStaticParams() {
  return getSites().map((s) => ({ slug: s.slug }));
}

export default async function EmbalsePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = getSite(slug);
  if (!site) notFound();

  const snapshot = await readLatest(slug);

  if (!snapshot) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-bold">{site.nombre}</h1>
        <p className="text-zinc-500">
          Todavía no hay datos. Ejecuta{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">npm run fetch</code> para
          generar <code>data/{slug}/latest.json</code>.
        </p>
        <Link href="/" className="text-sm text-sky-600 underline">← Todos los embalses</Link>
      </main>
    );
  }

  const tsEsFecha = /^\d{4}-\d{2}-\d{2}$/.test(snapshot.ts);
  const actualizado = tsEsFecha ? fechaCorta(snapshot.ts) : hora(snapshot.ts);
  const now = new Date();
  const recomendaciones = snapshot.veda.map((v) => recomendar(v.especie, snapshot, now));
  const ubicacion = [site.municipio_presa, site.provincia].filter(Boolean).join(", ");
  const zonas = await getZonas(slug);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6">
        <Link href="/" className="text-sm text-sky-600 hover:underline">← Todos los embalses</Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{site.nombre}</h1>
        <p className="text-sm text-zinc-500">
          Río {site.rio}{ubicacion && ` · ${ubicacion}`} · Actualizado {actualizado}
        </p>
      </header>

      {snapshot.stale && (
        <div className="mb-6">
          <StaleBanner stale={snapshot.stale} />
        </div>
      )}

      <div className="mb-6 h-80 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <MapClient
          embalse={{ lat: site.lat, lon: site.lon, nombre: site.nombre }}
          estacion={
            site.saih
              ? { lat: site.saih.lat, lon: site.saih.lon, codigo: site.saih.estacion }
              : undefined
          }
          hidro={{
            volumen_hm3: snapshot.hidro.volumen_hm3.value,
            llenado_pct: snapshot.hidro.llenado_pct.value,
            nivel_msnm: snapshot.hidro.nivel_msnm?.value,
            capacidad_hm3: site.capacidad_hm3,
          }}
          viento={{
            kmh: snapshot.meteo.viento_kmh.value,
            deg: snapshot.meteo.viento_dir_deg.value,
            rumbo: rumbo(snapshot.meteo.viento_dir_deg.value),
          }}
          zonas={zonas}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot.actividad && <ActivityCard actividad={snapshot.actividad} />}
        <BarometricCard meteo={snapshot.meteo} />
        <WindCard meteo={snapshot.meteo} />
        <TempCard meteo={snapshot.meteo} />
        <HydroCard hidro={snapshot.hidro} site={site} />
        <SolunarCard solunar={snapshot.solunar} />
        {snapshot.veda.length > 0 ? (
          <EspeciePanel veda={snapshot.veda} recomendaciones={recomendaciones} avisos={site.avisos} />
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2">
            Veda no disponible automáticamente para este embalse. Consulta la normativa de pesca de{" "}
            <strong>{site.comunidad}</strong>.
          </section>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        <HistoryChart slug={slug} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Todas las lecturas</h2>
        <ReadingsTable snapshot={snapshot} />
      </section>

      <div className="mt-8">
        <SourceFooter />
      </div>
    </main>
  );
}
