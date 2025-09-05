Param(
  [string]$DbDsn,
  [string]$ContainerName = 'casino_pg'
)

$sqlFile = "scripts/sql/verify_schema.sql"
if (-not (Test-Path $sqlFile)) { throw "Missing $sqlFile" }

if ($DbDsn) {
  Write-Host "Verifying schema via DSN: $DbDsn"
  & psql $DbDsn -v ON_ERROR_STOP=1 -X -f $sqlFile
  if ($LASTEXITCODE -ne 0) { throw 'Verification failed' }
  exit 0
}

# Detect docker compose
$composeExe = $null
$composeArgs = @()
try {
  $null = & docker compose version 2>$null
  if ($LASTEXITCODE -eq 0) { $composeExe = 'docker'; $composeArgs = @('compose') }
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
if ($env:COMPOSE_ARGS) { $extra = $env:COMPOSE_ARGS -split ' ' }

Write-Host "Ensuring postgres is up..."
& $composeExe @composeArgs @extra up -d postgres | Out-Null

Write-Host "Waiting for postgres to be healthy..."
$max = 60
for ($i=0; $i -lt $max; $i++) {
  & $composeExe @composeArgs @extra exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
  if ($i -eq ($max - 1)) { throw "Postgres not ready after $max seconds" }
}

Write-Host "Copying SQL and running verification..."
& docker cp $sqlFile "$ContainerName`:/tmp/verify_schema.sql"
& $composeExe @composeArgs @extra exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/verify_schema.sql'
if ($LASTEXITCODE -ne 0) { throw 'Verification failed' }

Write-Host "Verification complete."

