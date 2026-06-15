#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "✓ Creado .env desde .env.example"
fi

echo "→ Instalando dependencias…"
npm install

HAS_DOCKER=false
if command -v docker >/dev/null 2>&1; then
  HAS_DOCKER=true
fi

if $HAS_DOCKER; then
  echo "→ Iniciando PostgreSQL + Mailpit (Docker)…"
  docker compose --profile dev up -d db mailpit

  echo "→ Esperando PostgreSQL…"
  for i in {1..30}; do
    if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-app}" -d "${POSTGRES_DB:-household_budget}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
else
  echo ""
  echo "⚠  Docker no está instalado (command not found: docker)."
  echo "   Opciones:"
  echo "   1. Instalar Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/"
  echo "   2. PostgreSQL local:  brew install postgresql@16 && brew services start postgresql@16"
  echo "      Luego crea la BD:  createdb household_budget"
  echo "      Usuario/contraseña en .env → DATABASE_URL"
  echo ""
  echo "   Continuando asumiendo Postgres en localhost:5432 (ver DATABASE_URL en .env)…"
  echo ""
fi

echo "→ Migraciones…"
npm run db:migrate

echo "→ Seed demo (opcional)…"
npm run db:seed || true

cat <<'EOF'

✓ Listo.

  Terminal 1:  npm run dev:api
  Terminal 2:  npm run dev

  API:     http://localhost:3000/api/health
  Web:     http://localhost:5173
  Demo:    demo@local.dev / demo1234

Ver INSTALL.md si algo falla.

EOF
