#!/usr/bin/env bash
set -euo pipefail

# Defaults for local Supabase
PGHOST=${PGHOST:-127.0.0.1}
PGPORT=${PGPORT:-54322}
PGDATABASE=${PGDATABASE:-postgres}
PGUSER=${PGUSER:-postgres}
PGPASSWORD=${PGPASSWORD:-postgres}

export PGPASSWORD

echo "Seeding database at $PGHOST:$PGPORT/$PGDATABASE as $PGUSER..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f supabase/seed.sql
echo "Seed complete."

