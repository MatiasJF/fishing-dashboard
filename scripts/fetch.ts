import { promises as fs } from "node:fs";
import path from "node:path";
import { getSites, readLatest, writeLatest, appendHistory } from "../lib/store";
import { gatherSources, buildSnapshot } from "../lib/normalize";
import type { SourceInputs } from "../lib/normalize";
import type { SiteConfig } from "../lib/types";

/**
 * Entrypoint del cron (GitHub Actions). Itera todos los embalses de config/sites.json,
 * orquesta las fuentes y escribe data/<slug>/latest.json + history.jsonl (CLAUDE.md §5/§8).
 * Único módulo con efectos (junto a lib/store.ts).
 */

/** Carga ligera de .env.local / .env (sin dependencias). En CI las vars vienen del entorno. */
async function loadDotEnv(): Promise<void> {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        // Solo asignamos valores no vacíos y solo si aún no hay uno bueno: así un
        // placeholder vacío en .env.local no ensombrece el valor real de .env.
        if (val && !process.env[m[1]]) process.env[m[1]] = val;
      }
    } catch {
      /* fichero ausente: normal en CI */
    }
  }
}

/** Resumen de salud de las fuentes (sin volcar secretos). */
function logHealth(nombre: string, inputs: SourceInputs): void {
  const estado = (ok: boolean) => (ok ? "ok" : "fallo");
  console.log(
    `[${nombre}] Fuentes → meteo:${estado(inputs.meteo.ok)} ` +
      `saih:${estado(inputs.hidroSaih.ok)} ` +
      `embalses:${estado(inputs.hidroEmbalses.ok)} ` +
      `solunar:${estado(inputs.solunar.ok)} ` +
      `veda:${estado(inputs.veda.ok)} ` +
      `aemet:${inputs.aemet ? estado(inputs.aemet.ok) : "n/a"}`
  );
  // Contraste AEMET vs Open-Meteo (informativo; AEMET no se persiste).
  if (inputs.aemet?.ok && inputs.meteo.ok && inputs.aemet.data.temp_c !== null) {
    const diff = (inputs.meteo.data.temp_c.value - inputs.aemet.data.temp_c).toFixed(1);
    console.log(
      `Contraste temp: Open-Meteo ${inputs.meteo.data.temp_c.value}°C vs ` +
        `AEMET ${inputs.aemet.data.temp_c}°C (Δ ${diff}°C)`
    );
  }
}

async function procesarSitio(site: SiteConfig, now: Date): Promise<void> {
  const previous = await readLatest(site.slug);
  const inputs = await gatherSources(site, now);
  logHealth(site.nombre, inputs);

  const snapshot = buildSnapshot(inputs, previous, now);
  await writeLatest(site.slug, snapshot);
  await appendHistory(site.slug, snapshot);

  console.log(
    `[${site.nombre}] Snapshot ${snapshot.ts} (actividad ${snapshot.actividad?.score ?? "?"}, ` +
      `stale: ${snapshot.stale?.join(", ") || "ninguno"}).`
  );
}

async function main(): Promise<void> {
  await loadDotEnv();
  const now = new Date();
  const sites = getSites();
  console.log(`Procesando ${sites.length} embalse(s)…`);

  let fallos = 0;
  for (const site of sites) {
    try {
      await procesarSitio(site, now);
    } catch (err) {
      fallos++;
      console.error(`[${site.nombre}] error:`, err instanceof Error ? err.message : err);
    }
  }
  if (fallos === sites.length && sites.length > 0) {
    throw new Error("Todos los embalses fallaron");
  }
}

main().catch((err) => {
  console.error("fetch.ts falló:", err);
  process.exit(1);
});
