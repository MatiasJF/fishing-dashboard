# Dashboard de pesca · Embalses del CHTajo

Dashboard web para planificar jornadas de pesca en los **embalses de la Cuenca del Tajo**
(51 embalses del SAIH Tajo, con San Juan como referencia). Sobre un mapa muestra las afecciones
que condicionan la actividad de los peces (presión barométrica, viento, estado del embalse,
solunar, vedas), un **índice de actividad** y **recomendaciones de técnica/cebo por especie**, y
guarda un histórico por embalse que sirve como dataset para predicción.

> Lee `CLAUDE.md` para la especificación completa (arquitectura, fuentes y decisiones).

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**.
- **Vercel** para el hosting (free tier).
- **GitHub Actions** (cron) para la captura de datos: NO hay servidor persistente.
- **Persistencia en ficheros**, multi-embalse: `data/<slug>/latest.json` (snapshot para la UI) y
  `data/<slug>/history.jsonl` (append-only, el dataset). Sin base de datos.
- **suncalc** (solunar local), **zod** (validación), **react-leaflet** (mapa),
  **playwright** (cosecha de embalses, solo dev).

## Embalses

- `/` lista todos los embalses (con % de llenado e índice de actividad); `/embalse/<slug>` es el
  detalle de cada uno.
- El listado vive en `config/sites.json` y se genera/amplía con `npm run harvest` (ver abajo).
- La **veda** parseada (Orden CM) solo aplica a embalses de Madrid; el resto muestra un aviso para
  consultar la normativa de su comunidad.

## Flujo de datos

```
GitHub Actions (cron ~30 min) → npm run fetch (scripts/fetch.ts)
  ├─ descarga Open-Meteo, AEMET (opc.), SAIH Tajo, embalses.net
  ├─ calcula solunar (local) y estado de veda (config)
  ├─ arma un Snapshot con fallback y resiliencia
  ├─ escribe data/latest.json  +  appende data/history.jsonl
  └─ git commit & push  →  Vercel redeploy  →  la web sirve los datos nuevos
```

## Comandos

```bash
npm run dev      # desarrollo local (http://localhost:3000)
npm run fetch    # itera config/sites.json y regenera data/<slug>/* en local
npm run harvest  # cosecha el listado de embalses del SAIH (Playwright headless)
npm run build    # build de producción
npm run lint     # ESLint
npm run test     # tests (vitest)
```

## Configuración

1. **Variables de entorno** (opcionales): copia `.env.example` a `.env.local`.
   - `AEMET_API_KEY` — capa de contraste oficial (solo San Juan). Gratis en
     <https://opendata.aemet.es>. Si se deja vacía, la app usa Open-Meteo (primaria) sin problema.
2. **Embalses**: `config/sites.json` (slug, coordenadas, comunidad, token SAIH, avisos de
   zona…). Se genera/amplía con `npm run harvest`.
3. **Recomendaciones**: `config/recomendaciones.json` — tabla curada de técnica/cebo por especie
   (heurística orientativa, editable).
4. **Vedas**: `config/veda.json` — especies y fechas de la Orden de vedas de la Comunidad de
   Madrid. ⚠️ Verifícalas cada temporada con la orden vigente.

## Cosecha de embalses (`npm run harvest`)

El portal del SAIH es una SPA que rellena el listado de embalses en cliente con **tokens
cifrados**, así que la cosecha usa un navegador headless (Playwright): abre el menú, entra en
«Embalses», lee el listado del DOM y, por cada estación, deriva capacidad y metadatos de su ficha.
Resultado → `config/sites.json` (preserva los campos curados a mano: avisos, embalsesnet_id).
Re-ejecútalo si algún token rota. Requiere `npx playwright install chromium` una vez.

## Fuentes de datos

| Capa        | Fuente primaria        | Fallback / contraste     | Notas                                   |
| ----------- | ---------------------- | ------------------------ | --------------------------------------- |
| Meteo       | Open-Meteo (sin key)   | AEMET OpenData (con key) | Deltas de presión con `past_days=2`     |
| Hidrología  | SAIH Tajo (horario)    | embalses.net (≈ diario)  | Volumen, %, cota (msnm) y desembalse    |
| Solunar     | Cálculo local (suncalc)| —                        | Sol, luna y periodos mayor/menor        |
| Veda        | `config/veda.json`     | —                        | Sin API; mantenimiento manual           |

### SAIH Tajo (cableado por token)

El portal `saihtajo.chtajo.es` no documenta su API, pero la ficha de cada estación se sirve por
AJAX en `index.php?w=get-estacion&x=<token>` y devuelve `{ response: { senales: [...] } }`, donde
cada señal trae su última lectura en `last`. Cada embalse de `config/sites.json` guarda su `token`
(cosechado con `npm run harvest`). El parser (`lib/sources/saihTajo.ts`) mapea las señales por
nombre (VOLUMEN EMBALSE, VOLUMEN PORCENTUAL, COTA EMBALSE, CAUDAL TOTAL DE SALIDA AL RIO) y vale
para cualquier estación. Si un token deja de funcionar, re-cosecha; la hidrología degrada a
**embalses.net** automáticamente cuando el SAIH lleva > 3 h sin dato.

## Despliegue

1. **GitHub Secrets**: añade `AEMET_API_KEY` en *Settings → Secrets and variables → Actions*
   (los tokens del SAIH viven en `config/sites.json`, no son secretos).
2. **Vercel**: conecta el repo. La web se sirve del último build; la frescura viene del push del
   cron, que dispara un redeploy. (`app/page.tsx` también revalida cada 15 min.)
3. `fetch.yml` corre cada ~30 min (y bajo demanda) e itera todos los embalses, commiteando `data/`.
   `harvest.yml` re-cosecha el listado mensualmente (y bajo demanda).

## Atribución

Datos: [Open-Meteo](https://open-meteo.com/), [AEMET OpenData](https://opendata.aemet.es/),
[SAIH Tajo (CHTajo)](https://saihtajo.chtajo.es/) y
[embalses.net](https://www.embalses.net/pantano-1178-san-juan.html) (datos hidrológicos MITECO,
CC BY 4.0). Cálculo solunar local con [SunCalc](https://github.com/mourner/suncalc).

> Herramienta orientativa. La temperatura del agua no está disponible (no hay fuente fiable para
> lago interior); se usa la del aire como proxy. Verifica siempre la normativa de vedas vigente.
