import type { VedaEstado } from "@/lib/types";

/** Indicador hábil/veda para una especie. */
export function VedaBadge({ estado }: { estado: VedaEstado["estado"] }) {
  const esVeda = estado === "veda";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        esVeda
          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      <span aria-hidden>{esVeda ? "🚫" : "✅"}</span>
      {esVeda ? "En veda" : "Hábil"}
    </span>
  );
}
