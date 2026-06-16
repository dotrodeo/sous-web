#!/usr/bin/env bash
# Build and (re)start the self-hosted stack. Run via: npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."

# Compose auto-loads a file named .env; otherwise fall back to .env.deploy.
COMPOSE_ARGS=()
if [[ -f .env ]]; then
  :
elif [[ -f .env.deploy ]]; then
  COMPOSE_ARGS=(--env-file .env.deploy)
else
  echo "error: no .env or .env.deploy found." >&2
  echo "       cp .env.deploy.example .env  # then fill in VITE_* and CLOUDFLARE_TUNNEL_TOKEN" >&2
  exit 1
fi

echo "▶ Building and starting sous-web…"
docker compose "${COMPOSE_ARGS[@]}" up -d --build

echo
docker compose "${COMPOSE_ARGS[@]}" ps
