# push.ps1
$ErrorActionPreference = "Stop"

# === Проект ===
$PROJECT_REF = "wsqhgnxmotswjantxopb"
$REGION      = "eu-central-1"
$DB_PASSWORD = "jUIIACyqpypRNGue"   # убери в секреты потом

# === DSN (кодируем пароль!) ===
$ENC_PASS = [System.Uri]::EscapeDataString($DB_PASSWORD)
$DB_URL   = "postgres://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-1-${REGION}.pooler.supabase.com:5432/postgres?sslmode=require"

Write-Host "Dumping schema..."
supabase db dump --db-url "$DB_URL" --schema public --schema discounts -f schema.sql

Write-Host "Dumping data..."
$env:PGPASSWORD = $DB_PASSWORD
$pgDumpArgs = @(
  "-h","aws-1-$REGION.pooler.supabase.com","-p","5432",
  "-U","postgres.$PROJECT_REF","-d","postgres",
  "--schema=public","--schema=discounts",
  "--data-only",
  # "--disable-triggers",   # включай только если точно работает в твоём проекте
  "--no-owner","--no-privileges",
  "-f","data.sql"
)
& pg_dump @pgDumpArgs
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed: $LASTEXITCODE" }
if (!(Test-Path data.sql) -or (Get-Item data.sql).Length -lt 1024) { throw "data.sql пустой или подозрительно мал" }

Write-Host "OK: schema.sql + data.sql готовы."