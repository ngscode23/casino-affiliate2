#!/usr/bin/env bash
set -euo pipefail

FILES=(
  ".env"
  ".env.local"
  "apps/web-next/.env.local"
)

SUPA_URL="https://wsqhgnxmotswjantxopb.supabase.co"
SUPA_PUBLISHABLE="sb_publishable_PemABWwYtVQnmoqmsOxSMA_nujVdFbD"
SUPA_ANON="sb_publishable_PemABWwYtVQnmoqmsOxSMA_nujVdFbD"
SUPA_SECRET="sb_secret_LTLCShbtpFfStSMYbOFV7Q_VV0G7syw"
COMMENT_LINE="# при желании продублируйте:"
PATTERN='^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_URL|SUPABASE_SECRET_KEY)='

for FILE in "${FILES[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    echo "⚠️  Файл $FILE не найден — пропускаем"
    continue
  fi

  echo "🔧 Обновляем $FILE"

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
