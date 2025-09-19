#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   # Docker (uses .env.docker for ports/creds)
#   COMPOSE_ARGS="--env-file .env.docker" ./scripts/verify.sh
#   # Direct connection (no Docker):
#   DB_DSN="postgresql://user:pass@host:port/db" ./scripts/verify.sh

SQL_FILE="scripts/sql/verify_schema.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo "Missing $SQL_FILE" >&2
  exit 1
fi

if [ -n "${DB_DSN:-}" ]; then
  echo "Verifying schema via DSN: $DB_DSN"
  psql "$DB_DSN" -v ON_ERROR_STOP=1 -X -f "$SQL_FILE"
  exit 0
fi

# Detect docker compose
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Docker Compose not found (need docker compose or docker-compose)" >&2
  exit 1
fi

COMPOSE_ARGS=${COMPOSE_ARGS:-}

echo "Ensuring postgres is up..."
"${DC[@]}" ${COMPOSE_ARGS} up -d postgres >/dev/null

echo "Waiting for postgres to be healthy..."
for i in {1..60}; do
  if "${DC[@]}" ${COMPOSE_ARGS} exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "Postgres not ready after 60s" >&2
    exit 1
  fi
done

echo "Running verification..."
# Copy SQL into container (uses explicit container name from compose)
CONTAINER_NAME=${CONTAINER_NAME:-casino_pg}
docker cp "$SQL_FILE" "$CONTAINER_NAME":/tmp/verify_schema.sql
"${DC[@]}" ${COMPOSE_ARGS} exec -T postgres sh -lc '
  set -eu
  psql -v ON_ERROR_STOP=1 -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/verify_schema.sql
'

echo "Verification complete."


