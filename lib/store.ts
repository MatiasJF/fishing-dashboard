import { promises as fs } from "node:fs";
import path from "node:path";
import { snapshotSchema } from "./schema";
import { zonasSchema, type ZonasFeatureCollection } from "./zonas";
import type { Snapshot, SiteConfig } from "./types";
import sitesConfig from "../config/sites.json";

/**
 * Acceso a ficheros del repo. Es el ÚNICO módulo (junto a scripts/fetch.ts) con
 * efectos de E/S (CLAUDE.md §11). Las fuentes son puras y no tocan disco.
 *
 * Multi-embalse: los datos viven en data/<slug>/latest.json y data/<slug>/history.jsonl.
 */

const DATA_DIR = path.join(process.cwd(), "data");

/** Todos los embalses configurados (config/sites.json). */
export function getSites(): SiteConfig[] {
  return (sitesConfig as { sites: SiteConfig[] }).sites;
}

/** Un embalse por su slug, o undefined si no existe. */
export function getSite(slug: string): SiteConfig | undefined {
  return getSites().find((s) => s.slug === slug);
}

/** Embalse por defecto (el primero) — usado por la home para redirigir. */
export function getDefaultSite(): SiteConfig {
  return getSites()[0];
}

function siteDir(slug: string): string {
  return path.join(DATA_DIR, slug);
}

async function ensureSiteDir(slug: string): Promise<void> {
  await fs.mkdir(siteDir(slug), { recursive: true });
}

/** Lee y valida data/<slug>/latest.json. Devuelve null si no existe o no valida. */
export async function readLatest(slug: string): Promise<Snapshot | null> {
  try {
    const raw = await fs.readFile(path.join(siteDir(slug), "latest.json"), "utf8");
    const parsed = snapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as Snapshot) : null;
  } catch {
    return null;
  }
}

/** Sobrescribe data/<slug>/latest.json con el snapshot (validado antes de escribir). */
export async function writeLatest(slug: string, snapshot: Snapshot): Promise<void> {
  snapshotSchema.parse(snapshot);
  await ensureSiteDir(slug);
  await fs.writeFile(
    path.join(siteDir(slug), "latest.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf8"
  );
}

/** Añade una línea (un Snapshot) a data/<slug>/history.jsonl. Append-only. */
export async function appendHistory(slug: string, snapshot: Snapshot): Promise<void> {
  snapshotSchema.parse(snapshot);
  await ensureSiteDir(slug);
  await fs.appendFile(
    path.join(siteDir(slug), "history.jsonl"),
    JSON.stringify(snapshot) + "\n",
    "utf8"
  );
}

/** Lee y valida las zonas (GeoJSON) de un embalse: config/zonas/<slug>.geojson. */
export async function getZonas(slug: string): Promise<ZonasFeatureCollection | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "config", "zonas", `${slug}.geojson`), "utf8");
    const parsed = zonasSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Lee el histórico completo de un embalse (una línea = un Snapshot). */
export async function readHistory(slug: string): Promise<Snapshot[]> {
  try {
    const raw = await fs.readFile(path.join(siteDir(slug), "history.jsonl"), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Snapshot);
  } catch {
    return [];
  }
}
