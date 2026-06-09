import type { SeccionSnapshot } from "@/lib/types";

const NOMBRES: Record<SeccionSnapshot, string> = {
  meteo: "meteorología",
  hidro: "hidrología",
  solunar: "solunar",
  veda: "veda",
};

/** Aviso cuando alguna sección reutiliza el último valor bueno (fuente caída). */
export function StaleBanner({ stale }: { stale?: SeccionSnapshot[] }) {
  if (!stale || stale.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      ⚠️ Datos sin actualizar en: <strong>{stale.map((s) => NOMBRES[s]).join(", ")}</strong>. Se
      muestra el último valor disponible.
    </div>
  );
}
