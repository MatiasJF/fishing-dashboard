import type { MeteoSnapshot } from "@/lib/types";
import { num, rumbo } from "@/lib/display";
import { Card, Procedencia } from "./Card";

export function WindCard({ meteo }: { meteo: MeteoSnapshot }) {
  const dir = meteo.viento_dir_deg.value;
  return (
    <Card titulo="Viento" icono="💨">
      <div className="flex items-center gap-4">
        <div
          className="text-3xl"
          style={{ transform: `rotate(${dir}deg)` }}
          aria-label={`Viento del ${rumbo(dir)}`}
          title={`Procedencia: ${rumbo(dir)} (${num(dir)}°)`}
        >
          ↓
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">{num(meteo.viento_kmh.value)}</span>
            <span className="text-zinc-500">km/h</span>
          </div>
          <p className="text-sm text-zinc-500">
            del {rumbo(dir)} ({num(dir)}°) · rachas {num(meteo.rachas_kmh.value)} km/h
          </p>
        </div>
      </div>
      <Procedencia source={meteo.viento_kmh.source} fetched_at={meteo.viento_kmh.fetched_at} />
    </Card>
  );
}

export function TempCard({ meteo }: { meteo: MeteoSnapshot }) {
  return (
    <Card titulo="Temperatura del aire" icono="🌡️">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{num(meteo.temp_c.value, 1)}</span>
        <span className="text-zinc-500">°C</span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Humedad {num(meteo.humedad_pct.value)} %</p>
      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
        La temperatura del agua no está disponible (fuente fiable pendiente); se usa el aire como
        proxy.
      </p>
      <Procedencia source={meteo.temp_c.source} fetched_at={meteo.temp_c.fetched_at} />
    </Card>
  );
}
