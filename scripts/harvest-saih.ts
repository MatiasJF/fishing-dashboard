import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

/**
 * Cosecha (dev/manual) del listado de embalses del SAIH Tajo y sus tokens.
 *
 * El portal es una SPA que rellena el listado en cliente con tokens cifrados, así que se
 * usa un navegador headless para capturar la respuesta JSON con `response.embalses`.
 * De cada embalse se extrae código, nombre, token (param `x` de get-estacion) y UTM→latlon;
 * se deriva la capacidad de una llamada a su ficha; y se fusiona con config/sites.json
 * preservando los campos curados a mano (avisos, embalsesnet_id, capacidad).
 *
 * Uso: `npm run harvest`. NO se ejecuta en el cron normal.
 */

const SITES_PATH = path.join(process.cwd(), "config", "sites.json");
const PORTAL = "https://saihtajo.chtajo.es/";

interface EstacionSaih {
  codigo?: string;
  nombre?: string;
  url?: string;
  tipoestacion?: string;
  comunidad?: string;
  provincia?: string;
  municipio?: string;
  zona?: string;
  utm?: { x: string | number; y: string | number; z?: string | number; huso?: number };
}

/** Inversa UTM→WGS84 (huso 30N). */
function utmToLatLon(x: number, y: number): { lat: number; lon: number } {
  const a = 6378137,
    f = 1 / 298.257223563,
    k0 = 0.9996;
  const e2 = f * (2 - f),
    ep2 = e2 / (1 - e2);
  const xp = x - 500000,
    lon0 = ((30 * 6 - 183) * Math.PI) / 180;
  const M = y / k0,
    mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const T1 = Math.tan(phi1) ** 2,
    C1 = ep2 * Math.cos(phi1) ** 2;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5);
  const D = xp / (N1 * k0);
  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24);
  const lon =
    lon0 +
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1) * D ** 5) / 120) /
      Math.cos(phi1);
  return { lat: +((lat * 180) / Math.PI).toFixed(5), lon: +((lon * 180) / Math.PI).toFixed(5) };
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function tokenDeUrl(url: string): string | undefined {
  const m = url.match(/[?&]x=([^&]+)/);
  return m ? m[1] : undefined;
}

function comunidadCorta(c?: string): string {
  if (!c) return "desconocida";
  return /madrid/i.test(c) ? "Madrid" : c;
}

interface Ficha {
  capacidad?: number;
  comunidad?: string;
  provincia?: string;
  municipio?: string;
  rio?: string;
}

/** Datos de la ficha de una estación (capacidad derivada + metadatos). */
async function fichaEstacion(token: string): Promise<Ficha> {
  try {
    const res = await fetch(`https://saihtajo.chtajo.es/index.php?w=get-estacion&x=${token}`);
    if (!res.ok) return {};
    const r = (await res.json())?.response ?? {};
    const senales = r.senales ?? [];
    const val = (re: RegExp, unidad?: RegExp) =>
      senales.find(
        (s: { nombre?: string; unidad?: string }) =>
          re.test(s.nombre ?? "") && (!unidad || unidad.test(s.unidad ?? ""))
      )?.last?.valor;
    const vol = val(/VOLUMEN/, /hm3/);
    const pct = val(/PORCENTUAL/);
    const capacidad =
      typeof vol === "number" && typeof pct === "number" && pct > 0
        ? Math.round(vol / (pct / 100))
        : undefined;
    return {
      capacidad,
      comunidad: r.comunidad,
      provincia: r.provincia,
      municipio: r.municipio,
      rio: r.zona,
    };
  } catch {
    return {};
  }
}

/** Abre el menú del SAIH, entra en «Embalses» y lee el listado del DOM (#all). */
async function capturarEmbalses(): Promise<EstacionSaih[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  await page.goto(PORTAL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  // El menú está oculto: hay que abrirlo (#icon-menu) y pulsar el enlace «Embalses».
  await page.evaluate(() => {
    (document.querySelector("#icon-menu") as HTMLElement | null)?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const links = [...document.querySelectorAll("a")] as HTMLAnchorElement[];
    const t = links.find((a) =>
      /embals/i.test((a.textContent ?? "") + (a.getAttribute("href") ?? ""))
    );
    t?.click();
  });

  // Esperar a que la SPA rellene #all con la lista.
  let lista: EstacionSaih[] = [];
  for (let i = 0; i < 20 && !lista.length; i++) {
    await page.waitForTimeout(1000);
    lista = await page.evaluate(() => {
      const w = window as unknown as { jQuery?: (s: string) => { data: (k: string) => unknown } };
      const el = document.querySelector("#all");
      if (!w.jQuery || !el) return [];
      const d = w.jQuery("#all").data("all") as { response?: { embalses?: unknown[] } } | undefined;
      const emb = d?.response?.embalses;
      return Array.isArray(emb)
        ? emb.map((e) => (e as { estacion?: unknown }).estacion ?? e)
        : [];
    }) as EstacionSaih[];
  }

  await browser.close();
  return lista;
}

async function main(): Promise<void> {
  console.log("Cosechando embalses del SAIH Tajo (headless)…");
  const estaciones = (await capturarEmbalses()).filter((e) => e.url && e.nombre);
  console.log(`Embalses capturados: ${estaciones.length}`);
  if (!estaciones.length) {
    console.error("No se capturó ningún embalse. ¿Cambió el portal? Abortando sin tocar sites.json.");
    process.exit(1);
  }

  // Config existente (preservar campos curados a mano).
  const existente = JSON.parse(await fs.readFile(SITES_PATH, "utf8")) as {
    _nota?: string;
    sites: Record<string, unknown>[];
  };
  const porSlug = new Map(existente.sites.map((s) => [s.slug as string, s]));

  let nuevos = 0;
  for (const e of estaciones) {
    const token = tokenDeUrl(e.url!);
    if (!token) continue;
    const slug = slugify(e.nombre!);
    const utm = e.utm;
    const coords =
      utm && utm.x !== "" && utm.y !== "" ? utmToLatLon(Number(utm.x), Number(utm.y)) : undefined;
    const ficha = await fichaEstacion(token);
    const prev = porSlug.get(slug) ?? {};

    const site = {
      slug,
      nombre: prev.nombre ?? e.nombre,
      lat: prev.lat ?? coords?.lat,
      lon: prev.lon ?? coords?.lon,
      capacidad_hm3: prev.capacidad_hm3 ?? ficha.capacidad,
      rio: prev.rio ?? ficha.rio ?? e.zona ?? "",
      cuenca: "Tajo",
      confederacion: "CHTajo",
      municipio_presa: prev.municipio_presa ?? ficha.municipio ?? e.municipio,
      provincia: prev.provincia ?? ficha.provincia ?? e.provincia,
      comunidad: prev.comunidad ?? comunidadCorta(ficha.comunidad ?? e.comunidad),
      embalsesnet_id: prev.embalsesnet_id,
      timezone: "Europe/Madrid",
      saih: {
        estacion: e.codigo,
        token,
        lat: coords?.lat,
        lon: coords?.lon,
        z_msnm: utm?.z !== undefined ? Number(utm.z) : undefined,
      },
      avisos: prev.avisos,
    };
    if (!porSlug.has(slug)) nuevos++;
    porSlug.set(slug, site);
  }

  const sites = [...porSlug.values()].sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), "es")
  );
  await fs.writeFile(
    SITES_PATH,
    JSON.stringify({ _nota: existente._nota, sites }, null, 2) + "\n",
    "utf8"
  );
  console.log(`config/sites.json actualizado: ${sites.length} embalses (${nuevos} nuevos).`);
}

main().catch((err) => {
  console.error("harvest falló:", err);
  process.exit(1);
});
