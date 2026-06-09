"use client";

import { useState } from "react";
import type { VedaEstado } from "@/lib/types";
import type { Recomendacion } from "@/lib/recomendar";
import { Card } from "./Card";
import { VedaBadge } from "./VedaBadge";

export function EspeciePanel({
  veda,
  recomendaciones,
  avisos = [],
}: {
  veda: VedaEstado[];
  /** Alineadas por índice con `veda` (puede haber null si no hay regla). */
  recomendaciones: (Recomendacion | null)[];
  avisos?: string[];
}) {
  const [idx, setIdx] = useState(0);
  const sel = veda[idx];
  const reco = recomendaciones[idx];

  if (!sel) {
    return (
      <Card titulo="Especie" icono="🎣">
        <p className="text-sm text-zinc-500">Sin especies configuradas.</p>
      </Card>
    );
  }

  return (
    <Card titulo="Especie · veda y técnica" icono="🎣" className="sm:col-span-2">
      <label className="block">
        <span className="sr-only">Especie</span>
        <select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {veda.map((v, i) => (
            <option key={v.especie} value={i}>
              {v.especie}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-semibold">{sel.especie}</span>
        <VedaBadge estado={sel.estado} />
      </div>
      {sel.nota && <p className="mt-2 text-xs text-zinc-500">{sel.nota}</p>}

      {reco && (
        <div className="mt-4 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/40">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Recomendación ahora{" "}
            <span className="font-normal normal-case text-sky-600/70 dark:text-sky-400/70">
              ({reco.contexto.franja} · presión {reco.contexto.presion})
            </span>
          </p>
          <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-500">Técnica</dt>
              <dd className="font-medium">{reco.tecnica}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Señuelo / cebo</dt>
              <dd className="font-medium">{reco.senuelo_cebo}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Profundidad</dt>
              <dd className="font-medium">{reco.profundidad}</dd>
            </div>
          </dl>
          {reco.nota && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{reco.nota}</p>}
          <p className="mt-1 text-xs text-zinc-400">{reco.general}</p>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Reglas de zona en San Juan
          </p>
          <ul className="space-y-1.5">
            {avisos.map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span aria-hidden className="text-amber-500">⚠️</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
        Veda según la Orden 815/2026 (CM); recomendaciones orientativas. Verifica la normativa vigente.
      </p>
    </Card>
  );
}
