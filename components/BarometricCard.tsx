import type { MeteoSnapshot } from "@/lib/types";
import { num, tendenciaPresion } from "@/lib/display";
import { Card, Procedencia } from "./Card";

const tono = {
  baja: "text-amber-600 dark:text-amber-400",
  alza: "text-sky-600 dark:text-sky-400",
  estable: "text-zinc-500 dark:text-zinc-400",
};

export function BarometricCard({ meteo }: { meteo: MeteoSnapshot }) {
  const d24 = meteo.presion_delta_24h.value;
  const d48 = meteo.presion_delta_48h.value;
  const t = tendenciaPresion(d24);

  return (
    <Card titulo="Presión barométrica" icono="🧭">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{num(meteo.presion_hpa.value, 1)}</span>
        <span className="text-zinc-500">hPa</span>
      </div>
      <p className={`mt-2 text-sm font-medium ${tono[t.tono]}`}>
        {t.flecha} {t.etiqueta} · {t.pista}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
          <dt className="text-xs text-zinc-500">Δ 24 h</dt>
          <dd className="font-semibold tabular-nums">{d24 > 0 ? "+" : ""}{num(d24, 1)} hPa</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
          <dt className="text-xs text-zinc-500">Δ 48 h</dt>
          <dd className="font-semibold tabular-nums">{d48 > 0 ? "+" : ""}{num(d48, 1)} hPa</dd>
        </div>
      </dl>
      <Procedencia source={meteo.presion_hpa.source} fetched_at={meteo.presion_hpa.fetched_at} />
    </Card>
  );
}
