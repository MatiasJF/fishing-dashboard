import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

/**
 * Genera los iconos PWA a partir de un SVG, rasterizando con Chromium (Playwright).
 * Escribe app/icon.png (favicon), app/apple-icon.png y public/icon-{192,512}.png +
 * public/maskable-512.png. Uso: `npm run icons`.
 */

const ICON_SVG = (maskable = false) => {
  // En maskable dejamos "safe zone": el pez algo más pequeño y centrado.
  const s = maskable ? 0.72 : 0.84;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 96}" fill="url(#g)"/>
  <g transform="translate(256 256) scale(${s}) translate(-256 -256)">
    <!-- olas -->
    <path d="M96 360 q40 -28 80 0 t80 0 t80 0 t80 0" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="12" stroke-linecap="round"/>
    <!-- cuerpo del pez -->
    <path d="M150 230 C200 170 320 170 360 230 C320 290 200 290 150 230 Z" fill="#ffffff"/>
    <!-- cola -->
    <path d="M150 230 L110 195 L120 230 L110 265 Z" fill="#ffffff"/>
    <!-- ojo -->
    <circle cx="320" cy="222" r="11" fill="#0d9488"/>
  </g>
</svg>`;
};

async function render(svg: string, size: number, dest: string): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`
  );
  const el = await page.$("svg");
  const buf = await el!.screenshot({ omitBackground: true });
  await fs.writeFile(dest, buf);
  await browser.close();
  console.log(`✓ ${path.relative(process.cwd(), dest)} (${size}px)`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const normal = ICON_SVG(false);
  const maskable = ICON_SVG(true);
  await render(normal, 512, path.join(root, "public", "icon-512.png"));
  await render(normal, 192, path.join(root, "public", "icon-192.png"));
  await render(maskable, 512, path.join(root, "public", "maskable-512.png"));
  await render(normal, 180, path.join(root, "app", "apple-icon.png"));
  await render(normal, 256, path.join(root, "app", "icon.png"));
}

main().catch((e) => {
  console.error("icons falló:", e);
  process.exit(1);
});
