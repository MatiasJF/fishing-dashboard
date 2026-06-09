import type { HidroSnapshot, SiteConfig } from "@/lib/types";
import { num } from "@/lib/display";
import { Card, Procedencia } from "./Card";

export function HydroCard({ hidro, site }: { hidro: HidroSnapshot; site: SiteConfig }) {
  const pct = Math.max(0, Math.min(100, hidro.llenado_pct.value));
  return (
    <Card titulo="Estado del embalse" icono="💧">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{num(hidro.volumen_hm3.value, 1)}</span>
        <span className="text-zinc-500">
          hm³{site.capacidad_hm3 ? ` de ${num(site.capacidad_hm3)}` : ""}
        </span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-sm font-medium">{num(hidro.llenado_pct.value, 1)} % de llenado</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {hidro.nivel_msnm && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <dt className="text-xs text-zinc-500">Nivel</dt>
            <dd className="font-semibold tabular-nums">{num(hidro.nivel_msnm.value, 1)} msnm</dd>
          </div>
        )}
        {hidro.caudal_salida_m3s && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <dt className="text-xs text-zinc-500">Desembalse</dt>
            <dd className="font-semibold tabular-nums">{num(hidro.caudal_salida_m3s.value, 2)} m³/s</dd>
          </div>
        )}
        {hidro.caudal_entrada_m3s && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <dt className="text-xs text-zinc-500">Entrada</dt>
            <dd className="font-semibold tabular-nums">{num(hidro.caudal_entrada_m3s.value, 2)} m³/s</dd>
          </div>
        )}
      </dl>
      <Procedencia source={hidro.volumen_hm3.source} fetched_at={hidro.volumen_hm3.fetched_at} />
    </Card>
  );
}
