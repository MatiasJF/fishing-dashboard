import type { Actividad } from "@/lib/types";
import { Card } from "./Card";

const COLOR: Record<Actividad["etiqueta"], string> = {
  baja: "text-zinc-500",
  moderada: "text-amber-500",
  alta: "text-lime-600 dark:text-lime-400",
  "muy alta": "text-emerald-600 dark:text-emerald-400",
};

const BAR: Record<Actividad["etiqueta"], string> = {
  baja: "bg-zinc-400",
  moderada: "bg-amber-500",
  alta: "bg-lime-500",
  "muy alta": "bg-emerald-500",
};

const FACTORES: { key: keyof Actividad["factores"]; label: string }[] = [
  { key: "solunar", label: "Solunar" },
  { key: "presion", label: "Presión" },
  { key: "viento", label: "Viento" },
  { key: "luna", label: "Luna" },
];

export function ActivityCard({ actividad }: { actividad: Actividad }) {
  return (
    <Card titulo="Índice de actividad" icono="🎯">
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold tabular-nums ${COLOR[actividad.etiqueta]}`}>
          {actividad.score}
        </span>
        <span className="text-zinc-500">/ 100</span>
        <span className={`ml-auto text-sm font-semibold capitalize ${COLOR[actividad.etiqueta]}`}>
          {actividad.etiqueta}
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${BAR[actividad.etiqueta]}`} style={{ width: `${actividad.score}%` }} />
      </div>

      <dl className="mt-4 space-y-2">
        {FACTORES.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-xs">
            <dt className="w-16 text-zinc-500">{f.label}</dt>
            <dd className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${actividad.factores[f.key]}%` }} />
              </div>
            </dd>
            <span className="w-7 text-right tabular-nums text-zinc-400">{actividad.factores[f.key]}</span>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-zinc-400">
        Heurística orientativa (solunar + presión + viento + luna).
      </p>
    </Card>
  );
}
