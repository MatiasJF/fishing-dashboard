#!/usr/bin/env bash
# Despliegue/actualización del Fishing Dashboard en el VPS.
# Uso: bash deploy/deploy.sh   (desde la raíz del proyecto, /opt/fishing-dashboard)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Actualizando código…"
git pull --ff-only

echo "→ Instalando dependencias…"
npm ci

echo "→ Capturando datos iniciales…"
npm run fetch || echo "aviso: fetch falló (se reintentará por el timer)"

echo "→ Compilando…"
npm run build

echo "→ Reiniciando servicio…"
sudo systemctl restart fishing-dashboard

echo "✓ Desplegado. La captura periódica la gestiona fishing-fetch.timer."
