# CLAUDE.md — Dashboard de pesca · Embalse de San Juan

> Guía de proyecto para Claude Code. Lee este archivo entero antes de generar o editar código.
> Idioma del proyecto: español (UI, comentarios y commits en español).

## 1. Objetivo

Dashboard web para planificar jornadas de pesca en el **Embalse de San Juan** (río Alberche,
Cuenca del Tajo, Comunidad de Madrid). Muestra, sobre un mapa del embalse, las afecciones que
condicionan la actividad de los peces y un histórico que servirá como dataset para predicción.

Visualiza:
- **Mapa** del embalse con marcadores (presa, estación SAIH, dirección del viento).
- **Afección barométrica**: presión actual y delta 24/48 h (indicador de frente).
- **Afección fluvial**: % llenado, volumen (hm³), caudal/desembalses del Alberche.
- **Viento**: velocidad, dirección, rachas.
- **Temperatura**: aire actual y tendencia (la del agua es un *gap* conocido, ver §7).
- **Fase del calendario**: solunar (fase lunar, orto/ocaso sol y luna, periodos mayores/menores)
  y estado de **veda** de la especie objetivo.
- **Tablas** con todos los valores y su `fetched_at` + `source`.

## 2. Decisiones de arquitectura (cerradas)

- **Stack**: Next.js (App Router, TypeScript).
- **Hosting web**: Vercel (free tier).
- **Tarea programada**: GitHub Actions (workflow `schedule`), NO un servidor persistente.
- **Datos hidrológicos**: ambas fuentes con respaldo (SAIH Tajo primario, embalses.net/MITECO de
  fallback). Cada dato lleva `source` y `fetched_at` para mostrar procedencia.
- **Persistencia**: ficheros en el repo (no DB). `data/latest.json` (snapshot para la UI) +
  `data/history.jsonl` (append-only, es el dataset). Git-friendly y exportable.

### Flujo de datos
```
GitHub Actions (cron ~cada 30 min)
  └─ node scripts/fetch.ts
       ├─ descarga: Open-Meteo, AEMET(opc), SAIH Tajo, embalses.net
       ├─ calcula: solunar (local), estado de veda (config)
       ├─ normaliza a un único objeto Snapshot
       ├─ escribe data/latest.json (sobrescribe)
       └─ añade una línea a data/history.jsonl (append)
  └─ git commit & push  ──►  Vercel redeploy  ──►  Next.js lee data/*.json
```
> El cron de GitHub Actions se retrasa con frecuencia y su mínimo real es ~5 min; no asumir
> puntualidad. Cada 30 min es suficiente (el SAIH refresca cada ~15 min).

## 3. Constantes del sitio (`config/site.json`)

```json
{
  "nombre": "Embalse de San Juan",
  "lat": 40.333,
  "lon": -4.333,
  "capacidad_hm3": 138,
  "rio": "Alberche",
  "cuenca": "Tajo",
  "confederacion": "CHTajo",
  "municipio_presa": "San Martín de Valdeiglesias",
  "provincia": "Madrid",
  "embalsesnet_id": 1178,
  "timezone": "Europe/Madrid"
}
```

## 4. Fuentes de datos (contratos)

Implementar cada fuente en `lib/sources/<fuente>.ts` con una función que devuelva su parte
normalizada y NUNCA lance: ante error, devolver `{ ok: false, error }` para que el orquestador
aplique fallback.

### 4.1 Meteo — Open-Meteo (PRIMARIA, sin API key)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=40.333&longitude=-4.333
  &current=temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl,
           wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover
  &hourly=surface_pressure,pressure_msl,temperature_2m,wind_speed_10m
  &timezone=Europe/Madrid
```
- La presión para el delta 24/48 h se calcula a partir del array `hourly.pressure_msl`.

### 4.2 Meteo — AEMET OpenData (OFICIAL, opcional, requiere API key)
- Requiere `AEMET_API_KEY` (GitHub Secret). Solicitar gratis en opendata.aemet.es.
- Patrón en DOS pasos: la primera llamada devuelve un JSON con un campo `datos` que es la URL
  real donde están los datos; hay que hacer una segunda petición a esa URL.
- Endpoint útil: predicción horaria por municipio (San Martín de Valdeiglesias).
- Tratar como capa de contraste; si falla, no romper (Open-Meteo manda).

### 4.3 Hidrología — SAIH Tajo (PRIMARIA, fresca ~15 min)
- Portal: `https://saihtajo.chtajo.es/` — NO tiene API pública limpia.
- Estrategia: inspeccionar las peticiones de red de la ficha del embalse buscando un endpoint
  AJAX que devuelva JSON/CSV y usarlo si existe; si no, parsear el HTML.
- Extraer: nivel (msnm), volumen (hm³), % llenado, caudal entrada/salida si está disponible.
- Si falla o el dato está obsoleto → fallback a §4.4.

### 4.4 Hidrología — embalses.net / MITECO (FALLBACK, consolidada)
- Ficha San Juan: `https://www.embalses.net/pantano-1178-san-juan.html` (datos CC BY 4.0,
  atribuir). Más consolidado/semanal que el SAIH; sirve de respaldo, no de fuente principal.
- Registrar siempre `source: "saih" | "embalsesnet"` en el dato hidrológico.

### 4.5 Solunar — cálculo LOCAL (sin red)
- Usar `suncalc` (npm): `getTimes` (orto/ocaso sol), `getMoonTimes` (orto/ocaso luna),
  `getMoonIllumination` (fase + fracción iluminada).
- Periodos mayores/menores: derivar del tránsito lunar (paso superior = mayor; inferior = menor).
  Iterar `getMoonPosition` durante el día para localizar el máximo/mínimo de altitud lunar.
- Calcular siempre en `Europe/Madrid` y para lat/lon del sitio.

### 4.6 Veda — config estática (`config/veda.json`)
- NO existe API. Mantener a mano con las fechas de la **orden de vedas vigente de la Comunidad
  de Madrid**. El usuario debe verificar y actualizar cada temporada.
- Estructura por especie con periodos hábiles/vedados. Especies relevantes en San Juan
  (verificar nombres/estado con la orden oficial): black bass, lucioperca, lucio, carpa, barbo.
- La UI calcula el estado de hoy (hábil/veda) para la especie seleccionada.

## 5. Esquema de datos

`Snapshot` (objeto que se escribe en `latest.json` y como línea en `history.jsonl`):
```ts
type Reading<T> = { value: T; source: string; fetched_at: string /* ISO */ };

interface Snapshot {
  ts: string;                    // ISO, momento del fetch (Europe/Madrid)
  meteo: {
    temp_c: Reading<number>;
    humedad_pct: Reading<number>;
    presion_hpa: Reading<number>;
    presion_delta_24h: Reading<number>;   // calculado
    presion_delta_48h: Reading<number>;
    viento_kmh: Reading<number>;
    viento_dir_deg: Reading<number>;
    rachas_kmh: Reading<number>;
  };
  hidro: {
    nivel_msnm?: Reading<number>;
    volumen_hm3: Reading<number>;
    llenado_pct: Reading<number>;
    caudal_entrada_m3s?: Reading<number>;
    caudal_salida_m3s?: Reading<number>;
  };
  solunar: {
    fase_lunar: string; fraccion_iluminada: number;
    sol: { orto: string; ocaso: string };
    luna: { orto: string | null; ocaso: string | null };
    periodos: { tipo: "mayor" | "menor"; inicio: string; fin: string }[];
  };
  veda: { especie: string; estado: "habil" | "veda"; nota?: string }[];
}
```
> `history.jsonl` = un `Snapshot` por línea. Es el dataset; no reescribir, solo append.

## 6. Estructura del repo

```
app/
  page.tsx                 # dashboard (server component: lee data/latest.json)
  layout.tsx
components/
  Map.tsx                  # react-leaflet, import dinámico ssr:false (ver §7)
  BarometricCard.tsx
  WindCard.tsx
  HydroCard.tsx
  SolunarCard.tsx
  VedaBadge.tsx
  ReadingsTable.tsx
lib/
  sources/
    openMeteo.ts  aemet.ts  saihTajo.ts  embalses.ts  solunar.ts  veda.ts
  normalize.ts             # arma el Snapshot + lógica de fallback
  pressure.ts              # deltas de presión
  store.ts                 # lee/escribe data/*
scripts/
  fetch.ts                 # entrypoint del cron
config/
  site.json  veda.json
data/
  latest.json  history.jsonl   # generados por el cron; commiteados
.github/workflows/
  fetch.yml                # cron schedule
```

## 7. Gotchas (importantes)

- **Leaflet + Next.js**: Leaflet usa `window`; importar `Map.tsx` con
  `dynamic(() => import("./Map"), { ssr: false })`. Importar el CSS de Leaflet.
- **Zona horaria**: TODO en `Europe/Madrid`. No usar la hora del runner (GitHub usa UTC).
- **Fallback hidrológico**: SAIH primero; si `!ok` o dato más viejo que ~1 h → embalses.net.
  Reflejar siempre `source` en la UI para que se vea de dónde viene el número.
- **Resiliencia**: una fuente caída NO debe abortar el snapshot; usar el último valor bueno de
  `latest.json` si una sección falla y marcarlo como `stale`.
- **Frescura en Vercel**: la web sirve los datos del último build. La frescura viene del
  push del cron que redespliega. Opcional: `export const revalidate = 900` en `page.tsx`.
- **Temperatura del agua**: Open-Meteo no da temperatura fiable de lago interior. Dejar el campo
  preparado y, de momento, usar temp. del aire + tendencia como proxy. NO inventar el dato.
- **Atribución**: citar MITECO/AEMET; embalses.net es CC BY 4.0. Pie de página con fuentes.
- **Secrets**: `AEMET_API_KEY` en GitHub Secrets, nunca en el repo.

## 8. GitHub Actions (`.github/workflows/fetch.yml`)

- Trigger: `schedule: cron "*/30 * * * *"` + `workflow_dispatch` para pruebas manuales.
- Pasos: checkout → setup-node → `npm ci` → `node scripts/fetch.ts` → si hay cambios en `data/`,
  commit y push (usar `git-auto-commit` o `git diff --quiet || (git add data && git commit -m ... && git push)`).
- Permisos: `contents: write`.
- Inyectar `AEMET_API_KEY` desde secrets.

## 9. Comandos

```bash
npm run dev        # desarrollo local
npm run fetch      # ejecuta scripts/fetch.ts y regenera data/* en local
npm run build      # build de producción
npm run lint
```

## 10. Plan de trabajo sugerido (por fases)

1. **Andamiaje**: Next.js + TS + Tailwind, `config/site.json`, `lib/store.ts`, esquema `Snapshot`.
2. **Fuentes sin red local primero**: `solunar.ts` (suncalc) y `veda.ts` (config). Testeables ya.
3. **Meteo**: `openMeteo.ts` + `pressure.ts` (deltas). Snapshot meteo completo.
4. **Hidrología con fallback**: `saihTajo.ts` + `embalses.ts` + lógica en `normalize.ts`.
5. **Orquestador**: `scripts/fetch.ts` escribe `latest.json` y appende `history.jsonl`.
6. **UI**: cards + `ReadingsTable` + `Map` (react-leaflet). Mostrar `source`/`fetched_at`.
7. **CI/cron**: `fetch.yml`, secret AEMET, primer push de datos. Deploy en Vercel.
8. **Extras** (opcional): registro de capturas que snapshotea condiciones, índice de actividad
   (solunar + delta de presión), exportar `history.jsonl` a CSV.

## 11. Convenciones

- TypeScript estricto. Sin `any` salvo en los parsers de fuentes (acotar y validar con zod).
- Validar TODA respuesta externa con **zod** antes de normalizar.
- Funciones de fuente puras y testeables; sin efectos fuera de `store.ts`/`fetch.ts`.
- Commits en español, imperativo (p. ej. "añade fuente Open-Meteo").
- No introducir una base de datos ni un backend persistente sin discutirlo (rompe el modelo
  GitHub Actions + Vercel).
