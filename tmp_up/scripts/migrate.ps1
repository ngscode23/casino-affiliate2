Param(
  [string]$DbDsn
)

# If -DbDsn is provided, run migrations directly
if ($DbDsn) {
  Write-Host "Applying migrations to DSN: $DbDsn"
  Get-ChildItem -Path "supabase/migrations" -Filter *.sql | Sort-Object Name | ForEach-Object {
    if ($_.Name -like '*remote_schema*.sql' -or $_.Name -like '*supabase_only*.sql') {
      Write-Host "skip $($_.FullName) (supabase-only)"
      return
    }
    Write-Host "-> $($_.FullName)"
    & psql $DbDsn -v ON_ERROR_STOP=1 -X -f $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
  }
  Write-Host "Migrations applied via DSN"
  exit 0
}

# Detect docker compose (v2 or legacy)
$composeExe = $null
$composeArgs = @()
try {
  $null = & docker compose version 2>$null
  if ($LASTEXITCODE -eq 0) {
    $composeExe = 'docker'
    $composeArgs = @('compose')
  }
} catch {}
if (-not $composeExe) {
  if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeExe = 'docker-compose'
    $composeArgs = @()
  } else {
    throw 'Docker Compose not found (need docker compose or docker-compose)'
  }
}

# Optional: COMPOSE_ARGS env (e.g. --env-file .env.docker)
$extra = @()
if ($env:COMPOSE_ARGS) {
  $extra = $env:COMPOSE_ARGS -split ' '
}

Write-Host "Ensuring postgres is up..."
& $composeExe @composeArgs @extra up -d postgres | Out-Null

Write-Host "Waiting for postgres to be healthy..."
$max = 90
for ($i=0; $i -lt $max; $i++) {
& $composeExe @composeArgs @extra exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
  if ($i -eq ($max - 1)) { throw "Postgres not ready after $max seconds" }
}

Write-Host "Applying migrations from /migrations (mounted read-only)..."
$shScript = @'
set -eu
found=0
for f in /migrations/*.sql; do
  if [ -f "$f" ]; then
    case "$f" in
      *remote_schema*.sql|*supabase_only*.sql)
        echo "skip $f (supabase-only)" ;;
      *)
        found=1
        echo "-> $f"
        psql -v ON_ERROR_STOP=1 -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f" ;;
    esac
  fi
done
if [ "$found" -eq 0 ]; then
  echo "No migration files found in /migrations"; exit 0; fi
'@
& $composeExe @composeArgs @extra exec -T postgres sh -lc $shScript

Write-Host "Migrations applied."
