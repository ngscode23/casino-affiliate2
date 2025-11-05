#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="wsqhgnxmotswjantxopb"
SCHEMA_LIST="public"
PRISMA_COMMAND="db push"   # поменяй на "migrate dev" если нужно вести историю миграций

echo "Supabase CLI should be installed and linked."
read -rsp "Enter Supabase DB password: " DB_PASSWORD
echo

# Проверяем, что CLI знает про проект (иначе нужно сделать supabase link вручную один раз)
if ! supabase projects list | grep -q "${PROJECT_REF}"; then
  echo "Project ${PROJECT_REF} is not linked. Run 'supabase login' и 'supabase link --project-ref ${PROJECT_REF}' вручную."
  exit 1
fi

# Поднимаем туннель (поддержка разных версий CLI: сначала пробуем connect, затем fallback на remote)
echo "Starting remote tunnel..."
TUNNEL_ENV="$(mktemp -t supabase_db_env.XXXXXX)"

start_tunnel() {
  local mode="$1"  # connect | remote
  if [ "$mode" = "connect" ]; then
    echo "Trying: supabase --experimental db remote connect ..."
    supabase --experimental db remote connect \
      --password "${DB_PASSWORD}" \
      --schema "${SCHEMA_LIST}" \
      --output env \
      --yes | tee "${TUNNEL_ENV}" &
  else
    echo "Trying: supabase --experimental db remote ..."
    supabase --experimental db remote \
      --password "${DB_PASSWORD}" \
      --schema "${SCHEMA_LIST}" \
      --output env \
      --yes | tee "${TUNNEL_ENV}" &
  fi
  TUNNEL_PID=$!
}

start_tunnel connect

cleanup() {
  if ps -p "${TUNNEL_PID}" >/dev/null 2>&1; then
    kill "${TUNNEL_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${TUNNEL_ENV}"
}
trap cleanup EXIT

# Ждём пока CLI запишет переменные окружения (до 10 секунд)
for _ in $(seq 1 40); do
  if grep -q "^DATABASE_URL=" "${TUNNEL_ENV}" 2>/dev/null; then
    break
  fi
  # если CLI сразу вывел usage, переключаемся на fallback
  if grep -q "Usage:" "${TUNNEL_ENV}" 2>/dev/null; then
    if ps -p "${TUNNEL_PID}" >/dev/null 2>&1; then kill "${TUNNEL_PID}" 2>/dev/null || true; fi
    : > "${TUNNEL_ENV}"
    start_tunnel remote
  fi
  sleep 0.5
done

if ! grep -q "^DATABASE_URL=" "${TUNNEL_ENV}" 2>/dev/null; then
  echo "Не удалось получить DATABASE_URL от Supabase CLI (проверьте версию 'supabase --version' и выполнение 'supabase link')."
  echo "Содержимое вывода:" && cat "${TUNNEL_ENV}" || true
  exit 1
fi

# Вытаскиваем connection string из /tmp
source "${TUNNEL_ENV}"  # здесь лежит DATABASE_URL

# export нужен, чтобы prisma.config.ts его увидел
export DATABASE_URL

echo "DATABASE_URL: $DATABASE_URL"

# Prisma команды
pnpm prisma generate
if [ "${PRISMA_COMMAND}" = "migrate dev" ]; then
  pnpm prisma migrate dev --name="sync_$(date +%Y%m%d_%H%M%S)"
else
  pnpm prisma db push
fi
pnpm prisma db seed || echo "seed skipped (нет seeds?)."

echo "Done. Press Ctrl+C in другой вкладке, если туннель остался висеть."
