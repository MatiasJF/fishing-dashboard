import { promises as fs } from "node:fs";
import path from "node:path";
import { getSites } from "../lib/store";

/**
 * Cosecha (dev/manual) de las siluetas de los embalses desde OpenStreetMap (Overpass).
 * Escribe config/zonas/<slug>.geojson con el contorno del vaso como tipo "embalse"
 * (informativo, NO una figura legal). Preserva los ficheros ya existentes (p. ej. San Juan,
 * con sus zonas oficiales curadas). Re-ejecutable. Datos OSM © colaboradores, ODbL.
 *
 * Uso: `npm run zonas`.
 */

const ZONAS_DIR = path.join(process.cwd(), "config", "zonas");
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const UA = "san-juan-fishing-dashboard/1.0 (zonas OSM)";

interface NodoGeom {
  lat: number;
  lon: number;
}
interface OverpassEl {
  type: "way" | "relation" | "node";
  tags?: { name?: string; natural?: string; water?: string };
  geometry?: NodoGeom[];
  members?: { type: string; role: string; geometry?: NodoGeom[] }[];
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/embalse de |pantano de |contraembalse/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const paso = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * paso)]);
  return out;
}

/** Área aproximada (shoelace en grados, solo para comparar tamaños). */
function area(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

/** Anillo [lon,lat] a partir de un elemento Overpass (way o relación multipolígono). */
function ringDe(el: OverpassEl): [number, number][] | null {
  let nodos: NodoGeom[] | undefined;
  if (el.type === "way") {
    nodos = el.geometry;
  } else if (el.type === "relation") {
    const outers = (el.members ?? []).filter((m) => m.role === "outer" && m.geometry?.length);
    outers.sort((a, b) => (b.geometry!.length ?? 0) - (a.geometry!.length ?? 0));
    nodos = outers[0]?.geometry;
  }
  if (!nodos || nodos.length < 8) return null;
  const ring = nodos.map((p) => [+p.lon.toFixed(5), +p.lat.toFixed(5)] as [number, number]);
  if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) ring.push(ring[0]);
  return ring;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Consulta Overpass con reintentos y rotación de mirrors ante 429/504. */
async function overpass(lat: number, lon: number): Promise<OverpassEl[]> {
  const q = `[out:json][timeout:25];(way["natural"="water"](around:7000,${lat},${lon});relation["natural"="water"](around:7000,${lat},${lon}););out geom;`;
  let ultimoError = "sin intentos";
  for (let intento = 0; intento < 4; intento++) {
    const url = MIRRORS[intento % MIRRORS.length];
    try {
      const res = await fetch(`${url}?data=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": UA },
      });
      if (res.ok) {
        return ((await res.json()) as { elements: OverpassEl[] }).elements ?? [];
      }
      ultimoError = `HTTP ${res.status}`;
      if (res.status === 429 || res.status === 504) {
        await sleep(4000 * (intento + 1)); // backoff antes de reintentar/rotar
        continue;
      }
      throw new Error(ultimoError);
    } catch (e) {
      ultimoError = e instanceof Error ? e.message : String(e);
      await sleep(3000 * (intento + 1));
    }
  }
  throw new Error(`Overpass agotado (${ultimoError})`);
}

async function main(): Promise<void> {
  await fs.mkdir(ZONAS_DIR, { recursive: true });
  const sites = getSites();
  let escritos = 0,
    saltados = 0,
    fallos = 0;

  for (const site of sites) {
    const dest = path.join(ZONAS_DIR, `${site.slug}.geojson`);
    try {
      await fs.access(dest);
      saltados++;
      continue; // ya existe (curado o cosechado): no se toca
    } catch {
      /* no existe: lo generamos */
    }

    try {
      const els = await overpass(site.lat, site.lon);
      const objetivo = norm(site.nombre);
      const cands = els
        .map((el) => ({ el, ring: ringDe(el) }))
        .filter((c): c is { el: OverpassEl; ring: [number, number][] } => c.ring !== null);

      if (!cands.length) {
        console.log(`· ${site.slug}: sin contorno en OSM`);
        fallos++;
        await sleep(1200);
        continue;
      }
      // Preferir coincidencia de nombre; si no, el de mayor área.
      const conNombre = cands.filter((c) => {
        const n = norm(c.el.tags?.name ?? "");
        return n && (n.includes(objetivo) || objetivo.includes(n));
      });
      const pool = conNombre.length ? conNombre : cands;
      pool.sort((a, b) => area(b.ring) - area(a.ring));
      const ring = downsample(pool[0].ring, 150);
      if (ring.at(-1)! !== ring[0]) ring.push(ring[0]);

      const fc = {
        type: "FeatureCollection",
        _nota: `Contorno del vaso desde OpenStreetMap (ODbL). Informativo, no figura legal.`,
        features: [
          {
            type: "Feature",
            properties: {
              nombre: `${site.nombre} (contorno)`,
              tipo: "embalse",
              nota: "Silueta del embalse (OpenStreetMap, ODbL).",
            },
            geometry: { type: "Polygon", coordinates: [ring] },
          },
        ],
      };
      await fs.writeFile(dest, JSON.stringify(fc, null, 1) + "\n", "utf8");
      escritos++;
      console.log(`✓ ${site.slug} (${ring.length} pts)`);
    } catch (e) {
      fallos++;
      console.log(`· ${site.slug}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(2500); // cortesía con Overpass
  }

  console.log(`\nZonas: ${escritos} escritas, ${saltados} preservadas, ${fallos} sin contorno.`);
}

main().catch((err) => {
  console.error("zonas-osm falló:", err);
  process.exit(1);
});
