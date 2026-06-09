"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { PuntoSerie } from "@/lib/history";

const RANGOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

function tickTs(ts: string): string {
  // ts ISO local de Madrid: "YYYY-MM-DDTHH:mm…"
  const fecha = `${ts.slice(8, 10)}/${ts.slice(5, 7)}`;
  return `${fecha} ${ts.slice(11, 13)}h`;
}

function Grafica({
  titulo,
  puntos,
  lineas,
}: {
  titulo: string;
  puntos: PuntoSerie[];
  lineas: { key: keyof PuntoSerie; nombre: string; color: string }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{titulo}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={puntos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="ts" tickFormatter={tickTs} tick={{ fontSize: 11 }} minTickGap={40} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={48} />
          <Tooltip
            labelFormatter={(label) => tickTs(String(label))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lineas.map((l) => (
            <Line
              key={String(l.key)}
              type="monotone"
              dataKey={l.key}
              name={l.nombre}
              stroke={l.color}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoryChart({ slug }: { slug: string }) {
  const [dias, setDias] = useState(30);
  const [puntos, setPuntos] = useState<PuntoSerie[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const d = await fetch(`/api/history/${slug}?days=${dias}`).then((r) => r.json());
        if (activo) setPuntos(d.puntos ?? []);
      } catch {
        if (activo) setPuntos([]);
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [slug, dias]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.dias}
            onClick={() => setDias(r.dias)}
            className={`rounded-full px-3 py-1 text-sm ${
              dias === r.dias
                ? "bg-sky-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {r.label}
          </button>
        ))}
        <a
          href={`/api/history/${slug}?days=${dias}&format=csv`}
          className="ml-auto rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:border-sky-400 dark:border-zinc-700 dark:text-zinc-300"
          download
        >
          ⬇ Exportar CSV
        </a>
      </div>

      {cargando ? (
        <p className="text-sm text-zinc-400">Cargando histórico…</p>
      ) : puntos.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Aún no hay suficiente histórico para este rango. Se acumula con cada ejecución del cron.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Grafica
            titulo="Llenado (%) e índice de actividad"
            puntos={puntos}
            lineas={[
              { key: "llenado_pct", nombre: "% llenado", color: "#0ea5e9" },
              { key: "actividad", nombre: "Actividad", color: "#16a34a" },
            ]}
          />
          <Grafica
            titulo="Presión (hPa)"
            puntos={puntos}
            lineas={[{ key: "presion_hpa", nombre: "Presión", color: "#f59e0b" }]}
          />
          <Grafica
            titulo="Nivel / cota (msnm)"
            puntos={puntos}
            lineas={[{ key: "nivel_msnm", nombre: "Cota", color: "#8b5cf6" }]}
          />
          <Grafica
            titulo="Temperatura (°C) y viento (km/h)"
            puntos={puntos}
            lineas={[
              { key: "temp_c", nombre: "Temp", color: "#ef4444" },
              { key: "viento_kmh", nombre: "Viento", color: "#64748b" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
