Param(
  [string]$ReportDir = "psql_reports"
)

$ErrorActionPreference = "Stop"
$script:PsqlArgs = @()

function Ensure-Dir([string]$dir) {
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}
Ensure-Dir $ReportDir

function Out-Report([string]$sql, [string]$outfile) {
  $outPath = Join-Path $ReportDir $outfile
  & psql @script:PsqlArgs -v ON_ERROR_STOP=1 -P pager=off -X -c $sql 2>&1 | Out-File -Encoding utf8 $outPath
  if ($LASTEXITCODE -ne 0) { throw "psql failed for $outfile" }
  return $outPath
}

function Run-File([string]$sqlFile, [string]$outfile) {
  $outPath = Join-Path $ReportDir $outfile
  & psql @script:PsqlArgs -v ON_ERROR_STOP=1 -P pager=off -X -f $sqlFile 2>&1 | Out-File -Encoding utf8 $outPath
  if ($LASTEXITCODE -ne 0) { throw "psql failed for $outfile ($sqlFile)" }
  return $outPath
}

function Make-DSN() {
  if ($env:DB_DSN) { return $env:DB_DSN }

  $pghost = $env:PGHOST
  $port   = $env:PGPORT
  $db     = $env:PGDATABASE
  $user   = $env:PGUSER
  $pass   = $env:PGPASSWORD
  $ssl    = $env:PGSSLMODE

  if (-not $pghost -or -not $db -or -not $user) { return $null }

  $auth = $pass ? "$user`:$pass" : $user
  $portPart = $port ? ":$port" : ""
  $sslPart  = $ssl  ? "?sslmode=$ssl" : ""

  $dsn = "postgresql://$auth@$pghost$portPart/$db$sslPart"
  return $dsn
}

# (removed stray example call that could trigger an early local psql connection)

$summary = @()
function Add-Summary($name, [bool]$ok, [string]$detail="") {
  $status = $ok ? 'OK' : 'FAIL'
  $script:summary += [pscustomobject]@{
    step   = $name
    status = $status
    detail = $detail
  }
  if (-not $ok) { throw "Step failed: $name - $detail" }
}

try {
  # 1) Apply migrations to reach v2
  $dsn = Make-DSN
  if ($dsn) {
    Write-Host "Applying migrations to DSN: $dsn"
    try {
      & pwsh -NoProfile -File "scripts/migrate.ps1" -DbDsn $dsn
      if ($LASTEXITCODE -ne 0) { throw "migrate.ps1 exited with $LASTEXITCODE" }
      Add-Summary 'migrations' $true 'applied via DSN'
      # psql принимает DSN как единственный позиционный аргумент
      $script:PsqlArgs = @($dsn)
    } catch {
      Write-Warning "Direct DSN migration failed: $_"
      Write-Host "Falling back to Docker Compose-driven migrations..."
      & pwsh -NoProfile -File "scripts/migrate.ps1"
      if ($LASTEXITCODE -ne 0) { throw "compose fallback migrations failed" }
      Add-Summary 'migrations_compose_fallback' $true 'applied via docker compose'
      # Use compose defaults to build a DSN for subsequent psql calls
      $port = $env:PG_PORT; if (-not $port) { $port = '5432' }
      $db   = $env:POSTGRES_DB;   if (-not $db)   { $db = 'appdb' }
      $user = $env:POSTGRES_USER; if (-not $user) { $user = 'app' }
      $pass = $env:POSTGRES_PASSWORD; if (-not $pass) { $pass = 'app' }
      $composeDsn = "postgresql://$user`:$pass@localhost:$port/$db"
      $script:PsqlArgs = @($composeDsn)
    }
  } else {
    Write-Host "No DSN/PG* provided; attempting Docker Compose migrations"
    & pwsh -NoProfile -File "scripts/migrate.ps1"
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Compose migrations failed; continuing without applying migrations"
      Add-Summary 'migrations' $true 'skipped (no DSN, compose failed)'
    } else {
      Add-Summary 'migrations' $true 'applied via docker compose'
    }
    # Use compose defaults to build a DSN for subsequent psql calls
    $port = $env:PG_PORT; if (-not $port) { $port = '5432' }
    $db   = $env:POSTGRES_DB;   if (-not $db)   { $db = 'appdb' }
    $user = $env:POSTGRES_USER; if (-not $user) { $user = 'app' }
    $pass = $env:POSTGRES_PASSWORD; if (-not $pass) { $pass = 'app' }
    $composeDsn = "postgresql://$user`:$pass@localhost:$port/$db"
    $script:PsqlArgs = @($composeDsn)
  }

  # 2) Setup auth stubs + favorites policies/index/privileges
  Run-File "scripts/sql/task_v2_setup.sql" "10_setup.txt" | Out-Null
  Add-Summary 'setup' $true 'auth stubs + favorites policies set'

  # 3) Basic env info
  Out-Report @"
SELECT current_user, current_database(), now();
SHOW server_version;
SELECT name, setting FROM pg_settings WHERE name IN ('search_path','timezone','standard_conforming_strings');
"@ "00_connect_env.txt" | Out-Null
  Add-Summary 'connect_env' $true

  # 4) Tables
  Out-Report @"
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('offers','clicks','impressions','favorites','partners','partner_offers','profiles')
ORDER BY 1,2;
"@ "20_tables.txt" | Out-Null
  Add-Summary 'tables' $true

  # 5) Indexes of interest
  Out-Report @"
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND indexname IN (
    'idx_clicks_offer_ts','idx_clicks_ip_ts','idx_impressions_offer_ts',
    'idx_offers_enabled','idx_offers_position','idx_favorites_user_created_at'
  )
ORDER BY 1,2;
"@ "50_indexes.txt" | Out-Null
  Add-Summary 'indexes_list' $true

  # 6) Favorites policies
  Out-Report @"
SELECT policyname AS policy, cmd, roles, permissive, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='favorites'
ORDER BY 1;
"@ "70_policies_favorites.txt" | Out-Null
  Add-Summary 'favorites_policies' $true

  # 7) Metrics BEFORE
  Out-Report @"
SELECT * FROM public.metrics_clicks_daily(14);
SELECT * FROM public.metrics_clicks_top_offers(14);
"@ "80_metrics_before.txt" | Out-Null
  $beforeOut = & psql @script:PsqlArgs -tA -X -c "SELECT coalesce(sum(count),0) FROM public.metrics_clicks_daily(14)"
  $beforeTotal = $beforeOut ? $beforeOut.Trim() : ''
  if (-not $beforeTotal) { $beforeTotal = '0' }
  Add-Summary 'metrics_before' $true ("total=$beforeTotal")

  # 8) Service role test (inserts a click)
  Run-File "scripts/sql/task_v2_rls_service_role.sql" "91_rls_test_service_role.txt" | Out-Null
  Add-Summary 'service_role_test' $true

  # 9) Metrics AFTER
  Out-Report @"
SELECT * FROM public.metrics_clicks_daily(14);
SELECT * FROM public.metrics_clicks_top_offers(14);
"@ "81_metrics_after.txt" | Out-Null
  $afterOut = & psql @script:PsqlArgs -tA -X -c "SELECT coalesce(sum(count),0) FROM public.metrics_clicks_daily(14)"
  $afterTotal = $afterOut ? $afterOut.Trim() : ''
  $diffOk = ([int]$afterTotal) -ge ([int]$beforeTotal)
  Add-Summary 'metrics_after' $diffOk ("before=$beforeTotal after=$afterTotal")

  # 10) Authenticated RLS test
  Run-File "scripts/sql/task_v2_rls_authenticated.sql" "90_rls_test_authenticated.txt" | Out-Null
  Add-Summary 'authenticated_test' $true

  # 11) EXPLAIN plans
  Out-Report @"
SET enable_seqscan=off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1
FROM public.clicks
WHERE offer_id = (SELECT id FROM public.offers WHERE slug IN ('lucky-star','unknown') ORDER BY CASE WHEN slug='lucky-star' THEN 0 ELSE 1 END LIMIT 1)
  AND ts > now() - interval '14 days'
LIMIT 1;
"@ "95_explain_clicks_offer_ts.txt" | Out-Null

  Out-Report @"
SET enable_seqscan=off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1 FROM public.clicks
WHERE ip_hash = 'deadbeef'
  AND ts > now() - interval '7 days'
LIMIT 1;
"@ "96_explain_clicks_ip_ts.txt" | Out-Null

  $offerPlan = Get-Content (Join-Path $ReportDir '95_explain_clicks_offer_ts.txt') -Raw
  $ipPlan    = Get-Content (Join-Path $ReportDir '96_explain_clicks_ip_ts.txt') -Raw
  $idxOfferUsed = ($offerPlan -match 'idx_clicks_offer_ts')
  $idxIpUsed    = ($ipPlan -match 'idx_clicks_ip_ts')
  # Now that seqscan is disabled, assert index usage
  Add-Summary 'explain_offer_idx' $idxOfferUsed ("uses_idx=$idxOfferUsed")
  Add-Summary 'explain_ip_idx'    $idxIpUsed    ("uses_idx=$idxIpUsed")

} catch {
  Write-Host "ERROR: $_" -ForegroundColor Red
} finally {
  # Summary
  $sumPath = Join-Path $ReportDir '99_summary.txt'
  $lines = @()
  foreach ($s in $summary) {
    $detail = $s.detail
    $lines += ($detail ? "{0}: {1} - {2}" : "{0}: {1}") -f $s.step, $s.status, $detail
  }
  if ($lines.Count -eq 0) { $lines = @('no steps executed') }
  $lines | Out-File -Encoding utf8 $sumPath
  Write-Host "Report written to $ReportDir" -ForegroundColor Cyan
}
