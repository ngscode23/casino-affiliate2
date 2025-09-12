param(
  [string]$ProjectRef = "wsqhgnxmotswjantxopb",
  [string]$DbUserPooler,
  [string]$DbPassword,
  [string]$DbName = "postgres",
  [string]$PoolerHost = "aws-1-eu-central-1.pooler.supabase.com",
  [int]$PortPooler = 6543,
  [switch]$Login,
  [switch]$Link,
  [switch]$List,
  [switch]$Push,
  [switch]$DryRun,
  [switch]$NoPrompt,
  [switch]$Verbose
)

function Format-DsnMasked([string]$dsn){ return ($dsn -replace '://([^:]+):([^@]+)@','://$1:***@') }

if ($Verbose) { $VerbosePreference = 'Continue' }

if (-not $DbUserPooler -or $DbUserPooler.Trim().Length -eq 0) {
  $DbUserPooler = "postgres.$ProjectRef"
}

if (-not $DbPassword -and -not $NoPrompt) {
  $sec = Read-Host "Введите пароль для $DbUserPooler" -AsSecureString
  $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  )
}
if (-not $DbPassword -or $DbPassword.Trim().Length -eq 0) {
  Write-Error "Не задан пароль. Либо укажи -DbPassword, либо убери -NoPrompt."
  exit 1
}

$Esc = [Uri]::EscapeDataString($DbPassword)
$PoolerDsn = ("{0}://{1}:{2}@{3}:{4}/{5}?sslmode=require&connect_timeout=5" -f 'postgresql', $DbUserPooler, $Esc, $PoolerHost, $PortPooler, $DbName)

$env:SUPABASE_PROJECT_REF = $ProjectRef
$env:SUPABASE_DB_POOLER  = $PoolerDsn
$env:PGSSLMODE = 'require'
if (-not $env:DNS_RESOLVER -or $env:DNS_RESOLVER -eq '') { $env:DNS_RESOLVER = 'https' }
$env:PYTHONIOENCODING='utf-8'; $env:PYTHONUTF8='1'

Write-Host "`n=== Параметры ===" -ForegroundColor Cyan
Write-Host ("REF          : {0}" -f $ProjectRef)
Write-Host ("POOLER USER  : {0}" -f $DbUserPooler)
Write-Host ("POOLER HOST  : {0}" -f $PoolerHost)
Write-Host ("POOLER PORT  : {0}" -f $PortPooler)
Write-Host ("DB NAME      : {0}" -f $DbName)
Write-Host ("DSN (pooler) : {0}" -f (Format-DsnMasked $PoolerDsn))

Write-Host "`n=== Проверка сети (TCP) ===" -ForegroundColor Cyan
Test-NetConnection $PoolerHost -Port $PortPooler | Select-Object ComputerName,RemoteAddress,RemotePort,TcpTestSucceeded

Write-Host "`n=== Проверка входа (psql) ===" -ForegroundColor Cyan
$q = "select current_user, coalesce((select ssl from pg_stat_ssl where pid=pg_backend_pid()), false) as ssl_used, now();"
psql "$PoolerDsn" -v ON_ERROR_STOP=1 -tAc $q
if ($LASTEXITCODE -ne 0) { Write-Error "psql вход не удался"; exit $LASTEXITCODE }

Write-Host "`n=== Supabase CLI ===" -ForegroundColor Cyan
supabase --version
if ($LASTEXITCODE -ne 0) { Write-Error "supabase CLI не найден в PATH"; exit 2 }

if ($Login) {
  if (-not $env:SUPABASE_ACCESS_TOKEN) { Write-Warning "SUPABASE_ACCESS_TOKEN не задан — пропускаю login" }
  else {
    supabase login --no-browser --token $env:SUPABASE_ACCESS_TOKEN
    if ($LASTEXITCODE -ne 0) { Write-Error "supabase login завершился с ошибкой"; exit $LASTEXITCODE }
  }
}

if ($Link) {
  supabase --dns-resolver https --workdir . link --project-ref $ProjectRef --yes
  if ($LASTEXITCODE -ne 0) { Write-Error "supabase link завершился с ошибкой"; exit $LASTEXITCODE }
}

if ($List) {
  Write-Host "`n=== Список миграций (remote by --db-url) ===" -ForegroundColor Cyan
  supabase --dns-resolver https migration list --db-url "$PoolerDsn"
  if ($LASTEXITCODE -ne 0) { Write-Error "migration list завершился с ошибкой"; exit $LASTEXITCODE }
}

if ($Push) {
  Write-Host "`n=== Пуш миграций (remote by --db-url) ===" -ForegroundColor Cyan
  $dry = if ($DryRun) { "--dry-run" } else { "" }
  supabase --dns-resolver https db push --db-url "$PoolerDsn" --yes $dry
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "db push не удался — пробую migration up"
    supabase --dns-resolver https migration up --db-url "$PoolerDsn"
    if ($LASTEXITCODE -ne 0) { Write-Error "migration up завершился с ошибкой"; exit $LASTEXITCODE }
  }
}

Write-Host "`nГотово." -ForegroundColor Green
