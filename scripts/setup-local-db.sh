#!/usr/bin/env bash
# Configura PostgreSQL local (macOS / Homebrew) sin Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_NAME="${POSTGRES_DB:-household_budget}"
PG_USER="${POSTGRES_USER:-$(whoami)}"
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"

if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql no encontrado."
  echo ""
  echo "Instala PostgreSQL:"
  echo "  brew install postgresql@16"
  echo "  brew services start postgresql@16"
  echo ""
  echo "O instala Docker Desktop y usa: docker compose --profile dev up -d db"
  exit 1
fi

echo "→ Usuario Postgres: ${PG_USER}"
echo "→ Base de datos:    ${DB_NAME}"

if ! psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c '\q' 2>/dev/null; then
  echo ""
  echo "❌ No se pudo conectar a Postgres en ${PG_HOST}:${PG_PORT} como ${PG_USER}"
  echo "   ¿Está corriendo?  brew services start postgresql@16"
  exit 1
fi

if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "→ La base '${DB_NAME}' ya existe"
else
  echo "→ Creando base '${DB_NAME}'…"
  createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$DB_NAME"
fi

# Sin contraseña — auth peer/trust típico en dev macOS
DATABASE_URL="postgres://${PG_USER}@${PG_HOST}:${PG_PORT}/${DB_NAME}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ Creado .env desde .env.example"
fi

ENV_FILE=".env"
if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$ENV_FILE"
  else
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$ENV_FILE"
  fi
else
  echo "DATABASE_URL=${DATABASE_URL}" >> "$ENV_FILE"
fi

# Quitar usuario 'app' de POSTGRES_USER si venía del ejemplo Docker
if grep -q '^POSTGRES_USER=app' "$ENV_FILE"; then
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' "s|^POSTGRES_USER=app|POSTGRES_USER=${PG_USER}|" "$ENV_FILE"
  else
    sed -i "s|^POSTGRES_USER=app|POSTGRES_USER=${PG_USER}|" "$ENV_FILE"
  fi
fi

if ! grep -q '^AUTH_SECRET=' "$ENV_FILE" || grep -q 'change-me' "$ENV_FILE"; then
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' 's|^AUTH_SECRET=.*|AUTH_SECRET=dev-secret-change-me-min-16-chars|' "$ENV_FILE"
  else
    sed -i 's|^AUTH_SECRET=.*|AUTH_SECRET=dev-secret-change-me-min-16-chars|' "$ENV_FILE"
  fi
fi

echo ""
echo "✓ Listo. DATABASE_URL actualizado en .env:"
echo "  ${DATABASE_URL}"
echo ""
echo "Siguiente:"
echo "  npm run db:migrate"
echo "  npm run db:seed"
echo "  npm run dev:api"
