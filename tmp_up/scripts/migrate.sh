#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   # Docker (использует .env.docker)
#   COMPOSE_ARGS="--env-file .env.docker" ./scripts/migrate.sh
#   # Прямое подключение (локальный/облачный PG/Supabase)
#   DB_DSN="postgresql://user:pass@host:port/db" ./scripts/migrate.sh
#
# Поведение:
#   - Если задан DB_DSN: гонит все supabase/migrations/*.sql напрямую (без Docker).
#   - Если DB_DSN не задан: идёт через docker compose и ПРЫГАЕТ remote_schema.sql (supabase-only).
#   - В Docker перед миграциями создаёт роли anon/authenticated/service_role.

# --- Путь 1: прямое подключение по DSN (без Docker) ---
if [ -n "${DB_DSN:-}" ]; then
  echo "Applying migrations to DSN: $DB_DSN"
  shopt -s nullglob
  for f in supabase/migrations/*.sql; do
    echo "-> $f"
    psql "$DB_DSN" -v ON_ERROR_STOP=1 -X -f "$f"
  done
  echo "Migrations applied via DSN"
  exit 0
fi

# --- Путь 2: через Docker Compose ---
# detect compose
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Docker Compose not found (need docker compose or docker-compose)" >&2
  exit 1
fi

# Доп. аргументы docker compose: например, --env-file .env.docker
COMPOSE_ARGS=${COMPOSE_ARGS:-}

echo "Ensuring postgres is up..."
"${DC[@]}" ${COMPOSE_ARGS} up -d postgres >/dev/null

echo "Waiting for postgres to be healthy..."
for f in /migrations/*.sql; do
    [ -e "$f" ] || continue
    case "$f" in
      *remote_schema*.sql|*favorites*.sql)
        echo "skip $f (supabase only)"
        ;;
      *)
        echo "-> $f"
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
        ;;
    esac
  done
echo "Bootstrapping roles (anon/authenticated/service_role) if missing..."
"${DC[@]}" ${COMPOSE_ARGS} exec -T postgres sh -lc '
  psql -v ON_ERROR_STOP=1 -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
DO \$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '\''anon'\'') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '\''authenticated'\'') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '\''service_role'\'') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
\$$;
"
'

echo "Applying migrations from /migrations (mounted read-only)..."
"${DC[@]}" ${COMPOSE_ARGS} exec -T postgres sh -lc '
  set -eu
  found=0
  for f in /migrations/*.sql; do
    [ -e "$f" ] || continue    # POSIX, вместо shopt/nullglob
    case "$f" in
      *remote_schema*.sql|*supabase_only*.sql)
        echo "skip $f (supabase-only)"
        ;;
      *)
        found=1
        echo "-> $f"
        psql -v ON_ERROR_STOP=1 -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
        ;;
    esac
  done
  if [ "$found" -eq 0 ]; then
    echo "No applicable migration files found in /migrations"
  fi
'

echo "Migrations applied."
