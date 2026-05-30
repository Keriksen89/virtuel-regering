#!/usr/bin/env bash
#
# google-kill.sh — emergency OFF switch for Google Photorealistic 3D Tiles.
#
# Stops the server from handing the Google Maps key to NEW page loads, then
# restarts the app so it takes effect immediately.
#
#   cd /var/www/virtuel-regering
#   ./deploy/google-kill.sh
#
# ⚠ This does NOT stop browser tabs that are ALREADY open — they hold the key
#   in memory and call Google directly until reloaded. For a guaranteed,
#   instant billing stop, ALSO kill it on Google's side (see the message below).
#
# Re-enable later with: ./deploy/google-restore.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_DIR}"

[ -f .env ] || { echo "✗ .env not found in ${REPO_DIR}"; exit 1; }

if grep -q '^GOOGLE_TILES_DISABLED=' .env; then
  sed -i 's/^GOOGLE_TILES_DISABLED=.*/GOOGLE_TILES_DISABLED=1/' .env
else
  printf '\nGOOGLE_TILES_DISABLED=1\n' >> .env
fi

if command -v pm2 >/dev/null && pm2 describe virtuel-regering >/dev/null 2>&1; then
  pm2 restart virtuel-regering --update-env >/dev/null
  echo "✓ Google tiles KILLED — new visitors get no 3D tiles (server restarted)."
else
  echo "✓ Flag set, but PM2 process not found — restart the app manually."
fi

cat <<'NOTE'

  Open tabs still hold the key until reloaded. For an IMMEDIATE, total stop:
    1. Google Cloud Console → APIs & Services → Credentials
    2. Either DELETE/REGENERATE the key, or disable the Map Tiles API,
       or set its quota to 0.
NOTE
