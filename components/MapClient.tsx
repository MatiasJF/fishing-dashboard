"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./Map";

/**
 * Carga el mapa solo en cliente. En Next 16, `ssr: false` con `next/dynamic` solo
 * se permite dentro de un Client Component (CLAUDE.md §7 + breaking change v16).
 */
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-zinc-400">
      Cargando mapa…
    </div>
  ),
});

export function MapClient(props: MapProps) {
  return <Map {...props} />;
}
