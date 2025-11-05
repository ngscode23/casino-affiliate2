$DB_PASSWORD = "jUIIACyqpypRNGue"
$PROJECT_REF = "wsqhgnxmotswjantxopb"
$REGION = "eu-central-1"   # подставь свой регион из строки Connect в Dashboard

$env:DATABASE_URL = "postgres://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-1-${REGION}.pooler.supabase.com:5432/postgres?sslmode=require"
# 2) sanity-check и генерация
pnpm prisma db push --schema prisma/discounts.prisma --skip-generate
