#!/usr/bin/env bash
#
# google-restore.sh — re-enable Google Photorealistic 3D Tiles after a kill.
#
#   cd /var/www/virtuel-regering
#   ./deploy/google-restore.sh
#
# Note: if you DELETED/REGENERATED the key in Google Cloud, also put the new
# key value into .env (GOOGLE_MAPS_KEY=...) before running this.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_DIR}"

[ -f .env ] || { echo "✗ .env not found in ${REPO_DIR}"; exit 1; }

if grep -q '^GOOGLE_TILES_DISABLED=' .env; then
  sed -i 's/^GOOGLE_TILES_DISABLED=.*/GOOGLE_TILES_DISABLED=0/' .env
else
  printf '\nGOOGLE_TILES_DISABLED=0\n' >> .env
fi

if command -v pm2 >/dev/null && pm2 describe virtuel-regering >/dev/null 2>&1; then
  pm2 restart virtuel-regering --update-env >/dev/null
  echo "✓ Google tiles RESTORED (server restarted)."
else
  echo "✓ Flag cleared, but PM2 process not found — restart the app manually."
fi
