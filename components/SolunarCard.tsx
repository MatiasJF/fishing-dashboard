import type { SolunarSnapshot } from "@/lib/types";
import { num, hora } from "@/lib/display";
import { Card } from "./Card";

export function SolunarCard({ solunar }: { solunar: SolunarSnapshot }) {
  return (
    <Card titulo="Solunar" icono="🌙">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{solunar.fase_lunar}</p>
          <p className="text-sm text-zinc-500">
            {num(solunar.fraccion_iluminada * 100)} % iluminada
          </p>
        </div>
        <div className="text-right text-sm text-zinc-500">
          <p>☀ {hora(solunar.sol.orto)} – {hora(solunar.sol.ocaso)}</p>
          <p>🌙 {hora(solunar.luna.orto)} – {hora(solunar.luna.ocaso)}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Periodos de actividad
        </p>
        <ul className="space-y-1.5">
          {solunar.periodos.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
            >
              <span
                className={
                  p.tipo === "mayor"
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "font-medium text-zinc-600 dark:text-zinc-300"
                }
              >
                {p.tipo === "mayor" ? "Mayor ●●" : "Menor ●"}
              </span>
              <span className="tabular-nums">
                {hora(p.inicio)} – {hora(p.fin)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
