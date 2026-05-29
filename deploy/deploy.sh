#!/usr/bin/env bash
#
# deploy.sh — pull the latest code and (re)start the app under PM2.
#
# Usage (on the VPS):
#   cd /var/www/virtuel-regering      # or wherever the repo lives
#   ./deploy.sh                       # deploys the default branch below
#   ./deploy.sh some-other-branch     # deploys a specific branch
#
# Safe to run repeatedly. Requires: git, node, npm, pm2, and a .env file
# next to ecosystem.config.cjs (never committed — holds the secrets).

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
BRANCH="${1:-claude/virtual-party-voting-t9e76}"
APP_NAME="virtuel-regering"

# Resolve the repo root (the dir this script lives in, minus /deploy).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_DIR}"

echo "▸ Repo:   ${REPO_DIR}"
echo "▸ Branch: ${BRANCH}"

# ── Preflight ────────────────────────────────────────────────────────────────
command -v git  >/dev/null || { echo "✗ git not found";  exit 1; }
command -v node >/dev/null || { echo "✗ node not found"; exit 1; }
command -v npm  >/dev/null || { echo "✗ npm not found";  exit 1; }
command -v pm2  >/dev/null || { echo "✗ pm2 not found (npm i -g pm2)"; exit 1; }

if [ ! -f ".env" ]; then
  echo "✗ .env is missing — copy .env.example to .env and fill in the secrets."
  exit 1
fi

# ── Pull latest ──────────────────────────────────────────────────────────────
echo "▸ Fetching…"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"   # match remote exactly, drop local drift

# ── Dependencies ─────────────────────────────────────────────────────────────
echo "▸ Installing production deps…"
npm ci --omit=dev

# ── (Re)start under PM2 ──────────────────────────────────────────────────────
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  echo "▸ Restarting ${APP_NAME}…"
  pm2 restart ecosystem.config.cjs --update-env
else
  echo "▸ Starting ${APP_NAME} for the first time…"
  pm2 start ecosystem.config.cjs
fi
pm2 save

# ── Smoke test ───────────────────────────────────────────────────────────────
PORT="$(grep -E '^PORT=' .env | cut -d= -f2 || true)"
PORT="${PORT:-3000}"
echo "▸ Health check on 127.0.0.1:${PORT}…"
sleep 2
if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "✓ Deploy OK — app is healthy on port ${PORT}."
else
  echo "✗ Health check failed. Inspect: pm2 logs ${APP_NAME} --lines 50"
  exit 1
fi
