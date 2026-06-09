# Despliegue en un VPS con dominio propio

Guía para servir el dashboard en un VPS (Ubuntu/Debian) con Nginx + HTTPS y
**auto-actualización de datos** mediante un *timer* de systemd.

## Cómo se actualiza solo (importante)

```
systemd timer (cada 30 min) → npm run fetch → escribe data/<slug>/latest.json + history.jsonl
        │
        └─ Next.js (next start) sirve las páginas con ISR (revalidate = 900 s)
             → cada ~15 min relee los ficheros y regenera; el endpoint /api/history es dinámico (siempre fresco)
```

No hace falta reconstruir ni reiniciar para que aparezcan datos nuevos: el *timer* actualiza los
ficheros y Next los recoge solo. Solo se reconstruye al **cambiar el código** (`deploy/deploy.sh`).

> Si despliegas en VPS, el cron de GitHub Actions `fetch.yml` es redundante (era para el modelo
> Vercel). Puedes desactivarlo en GitHub. La cosecha de embalses/zonas (`harvest`/`zonas`) sigue
> siendo manual y solo cuando quieras ampliar.

## Requisitos del VPS

- Node.js 20+ y npm.
- Nginx y Certbot (`sudo apt install nginx certbot python3-certbot-nginx`).
- DNS: un registro **A** del dominio apuntando a la IP del VPS.

## 1. Código y dependencias

```bash
sudo mkdir -p /opt/fishing-dashboard && sudo chown "$USER" /opt/fishing-dashboard
git clone git@github.com:MatiasJF/fishing-dashboard.git /opt/fishing-dashboard
cd /opt/fishing-dashboard
npm ci

# IMPORTANTE: en el VPS los datos los genera el timer y son la fuente de la verdad.
# Marca data/ como "skip-worktree" para que `git pull` no intente sobreescribirlos ni dé
# conflictos con la semilla del repo. (Una sola vez tras el clone.)
git ls-files data | xargs -r git update-index --skip-worktree
```

## 2. Variables de entorno (opcional)

```bash
cp .env.example .env
# Edita .env y pon AEMET_API_KEY si la tienes (mejora el contraste de San Juan).
```

## 3. Datos iniciales y build

```bash
npm run fetch     # genera data/<slug>/* (no necesita navegador)
npm run build
```

## 4. Servicios systemd (app + captura periódica)

```bash
sudo cp deploy/fishing-dashboard.service /etc/systemd/system/
sudo cp deploy/fishing-fetch.service /etc/systemd/system/
sudo cp deploy/fishing-fetch.timer /etc/systemd/system/
# Ajusta WorkingDirectory/User en los .service si no usas /opt y www-data.
sudo systemctl daemon-reload
sudo systemctl enable --now fishing-dashboard.service   # arranca la web (puerto 3000)
sudo systemctl enable --now fishing-fetch.timer         # captura cada 30 min
```

Comprobar: `systemctl status fishing-dashboard` · `systemctl list-timers fishing-fetch.timer`.

## 5. Nginx + dominio + HTTPS

Antes: crea un registro **A** `fischer` en la zona `jackson-strong.es` apuntando a la IP del VPS,
y abre el firewall (`sudo ufw allow 'Nginx Full'`). Comprueba la propagación con
`dig +short fischer.jackson-strong.es` antes de pedir el certificado.

```bash
sudo cp deploy/nginx-fishing-dashboard.conf /etc/nginx/sites-available/fishing-dashboard
sudo ln -s /etc/nginx/sites-available/fishing-dashboard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d fischer.jackson-strong.es   # añade HTTPS y renovación automática
```

## 6. Actualizar la app (nuevos commits)

```bash
cd /opt/fishing-dashboard && bash deploy/deploy.sh
```

## Mantenimiento opcional (cuando quieras, no es necesario para el día a día)

- **Ampliar embalses / refrescar tokens SAIH**: `npm run harvest` (requiere
  `npx playwright install chromium` una vez).
- **Regenerar siluetas de embalses (OSM)**: `npm run zonas`.
- **Regenerar iconos PWA**: `npm run icons`.

## PWA (instalar en el móvil)

La app es una PWA instalable. En el móvil, abre el dominio en Chrome/Safari y usa
**"Añadir a pantalla de inicio"**. Se instala con icono propio y se abre a pantalla completa.
Requiere HTTPS (paso 5), que los navegadores exigen para instalar PWAs.
