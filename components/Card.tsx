import type { ReactNode } from "react";
import { fuenteLabel, hora, fechaCorta } from "@/lib/display";

/** Tarjeta contenedora con título e (opcional) procedencia del dato. */
export function Card({
  titulo,
  icono,
  children,
  className = "",
}: {
  titulo: string;
  icono?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {icono && <span aria-hidden>{icono}</span>}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Línea de procedencia: fuente + momento del dato. */
export function Procedencia({
  source,
  fetched_at,
}: {
  source: string;
  fetched_at: string;
}) {
  // Si fetched_at es solo fecha (YYYY-MM-DD) mostramos la fecha; si trae hora, la hora.
  const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fetched_at);
  const momento = esSoloFecha ? fechaCorta(fetched_at) : hora(fetched_at);
  return (
    <p className="mt-3 text-xs text-zinc-400">
      {fuenteLabel(source)} · {momento}
    </p>
  );
}
