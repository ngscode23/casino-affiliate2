#!/usr/bin/env bash
set -euo pipefail

FILES=(
  ".env"
  ".env.local"
  "apps/admin/.env.local"
  "apps/web-next/.env.local"
)

extract_existing() {
  local key="$1"
  local value=""
  for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
      value="$(grep -E "^${key}=" "$file" | tail -n 1 | cut -d'=' -f2- | tr -d '\r')"
      if [[ -n "$value" ]]; then
        break
      fi
    fi
  done
  printf '%s' "$value"
}

prompt_value() {
  local __var="$1"
  local __prompt="$2"
  local __env_name="$3"
  local __default="$4"

  local __value="${!__env_name-}"
  if [[ -z "$__value" ]]; then
    __value="$__default"
  fi

  if [[ -t 0 ]]; then
    local hint="$__prompt"
    if [[ -n "$__value" ]]; then
      hint+=" [$__value]"
    fi
    read -rp "$hint: " __input || true
    if [[ -n "${__input-}" ]]; then
      __value="$__input"
    fi
  fi

  if [[ -z "$__value" ]]; then
    echo "❌ Не задано значение для $__prompt (переменная $__env_name)." >&2
    exit 1
  fi

  printf -v "$__var" '%s' "$__value"
}

DEFAULT_SUPA_URL="$(extract_existing NEXT_PUBLIC_SUPABASE_URL)"
DEFAULT_SUPA_PUBLISHABLE="$(extract_existing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
DEFAULT_SUPA_ANON="$(extract_existing NEXT_PUBLIC_SUPABASE_ANON_KEY)"
DEFAULT_SUPA_SECRET="$(extract_existing SUPABASE_SECRET_KEY)"

prompt_value SUPA_URL "Supabase URL" SUPABASE_URL "$DEFAULT_SUPA_URL"
prompt_value SUPA_PUBLISHABLE "Supabase publishable/anon key" SUPABASE_PUBLISHABLE "$DEFAULT_SUPA_PUBLISHABLE"
prompt_value SUPA_ANON "Supabase anon key" SUPABASE_ANON "$DEFAULT_SUPA_ANON"
prompt_value SUPA_SECRET "Supabase service key" SUPABASE_SECRET "$DEFAULT_SUPA_SECRET"

COMMENT_LINE="# при желании продублируйте:"
PATTERN='^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_URL|SUPABASE_SECRET_KEY)='

for FILE in "${FILES[@]}"; do
  STATUS="🔧 Обновляем"

  if [[ ! -f "$FILE" ]]; then
    DIRNAME="$(dirname "$FILE")"
    if [[ "$DIRNAME" != "." ]]; then
      mkdir -p "$DIRNAME"
    fi
    STATUS="🆕 Создаём"
    : > "$FILE"
  fi

  echo "$STATUS $FILE"

  tmp_file="$(mktemp)"
  awk -v pattern="$PATTERN" -v comment="$COMMENT_LINE" '
    $0 == comment { next }
    $0 ~ pattern { next }
    { print }
  ' "$FILE" > "$tmp_file"

  if [[ -s "$tmp_file" ]]; then
    tail -c1 "$tmp_file" 2>/dev/null | grep -q $'\n' || printf '\n' >> "$tmp_file"
  fi

  cat <<EOF >> "$tmp_file"
NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPA_PUBLISHABLE
$COMMENT_LINE
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON
SUPABASE_URL=$SUPA_URL
SUPABASE_SECRET_KEY=$SUPA_SECRET   # не коммитить
EOF

  mv "$tmp_file" "$FILE"
done

echo "✅ Все env обновлены."