# # scripts/audit.ps1 — быстрый аудит v2 (ролики, таблицы, индексы, RLS, функции, пины, explain)
# # Запуск (пример):
#   $env:PGHOST='aws-1-eu-central-1.pooler.supabase.com'
#   $env:PGPORT='6543'
#   $env:PGUSER='postgres.wsqhgnxmotswjantxopb'
#   $env:PGDATABASE='postgres'
#   $env:PGSSLMODE='require'
#   $env:PGPASSWORD=''
# psql "postgresql://postgres:e7TRclAGt7Yd3KEL@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
# psql "postgres://postgres.wsqhgnxmotswjantxopb:e7TRclAGt7Yd3KEL@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "\dt"
#   # Проверка пула (правильный логин!)
# временно на текущую сессию
$env:ADMIN_TOKEN = "ddb27690d96f4d788d0197ec209fa469"

# стартуем dev так, чтобы env точно подтянулись
netlify dev


# один раз
$env:SUPABASE_ACCESS_TOKEN = 'sbp_2cf36b652b0bf7dae159071b1f596c3f4dde43b5'
supabase login --no-browser --token $env:SUPABASE_ACCESS_TOKEN
supabase --dns-resolver https link --project-ref wsqhgnxmotswjantxopb --no-browser --yes

# затем просто
supabase --dns-resolver https db push
pg_dump --schema-only --no-owner --no-privileges \
  -t products -t categories -t inventory \
  "postgres://wsqhgnxmotswjantxopb:wsqhgnxmotswjantxopb@<host>:<port>/<db>" > schema.sql

# supabase logout
# $env:SUPABASE_CLI_EXPERIMENTAL="1"   # пусть будет включён на всякий случай
# supabase login --no-browser --token sbp_XXXXXXXXXXXXXXXXXXXXXXXX

# если пароль содержит спецсимволы — экранируем


#   sbp_4aa511cc14d1afeb77a38c67c51b1b399db79e78
# supabase login
# # вставляешь Personal Access Token из Dashboard → Account → Tokexopb

# npm i -g supabase
# cd C:\Project\casino-affiliate

# supabase init
# supabase link --project-ref wsqhgnxmotswjantxopb
# supabase db diff -f 001_init --linked

# git add supabase/migrations
# git commit -m "chore(db): initial schema from prod"

# supabase status
# # если там пусто/не тот проект — перелинкуй
# supabase link --project-ref wsqhgnxmotswjantxopb

# psql "postgresql://postgres:moo7QIZ8FVShZIl5@db.wsqhgnxmotswjantxopb.supabase.co:5432/postgres"

# # project_ref взять из Dashboard; формат типа abcd1234
# # в корне проекта
#                        # если миграции реально хранятся в репо
  
# IP=$(dig +short A db.wsqhgnxmotswjantxopb.supabase.co | head -n1)
# psql "host=db.wsqhgnxmotswjantxopb.supabase.co hostaddr=$IP port=5432 dbname=postgres user=postgres.wsqhgnxmotswjantxopb password=moo7QIZ8FVShZIl5 sslmode=require" -c "select now();"


# export DB_URL_REMOTE="postgresql://postgres.wsqhgnxmotswjantxopb:moo7QIZ8FVShZIl5@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&prepare=false"
# echo "$DB_URL_REMOTE"
# supabase db push --db-url "$DB_URL_REMOTE"
# export DB_URL_LOCAL='postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'
# export DB_URL_REMOTE='postgresql://postgres.wsqhgnxmotswjantxopb:@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require'

# # ЛОКАЛЬНАЯ база (supabase start создаёт её на 54322)
# $env:PGHOST_LOCAL="127.0.0.1"
# $env:PGPORT_LOCAL="54322"
# $env:PGUSER_LOCAL="postgres"
# $env:PGPASS_LOCAL="postgres"
# $env:PGDB_LOCAL="postgres"


# # supabase db push --db-url $env:DB_URL_REMOTE
# # supabase db pull --db-url $env:DB_URL_REMOTE
# # при необходимости:
# # supabase db push --db-url $env:DB_URL_REMOTE
# # supabase db pull --db-url $env:DB_URL_REMOTE

# # в Supabase Dashboard → Project Settings → Database возьми:
# #   - user (postgres.<hash>)
# #   - password
# #   - host (aws-1-eu-central-1.pooler.supabase.com)
# #   - port 6543 (pooler)
# wsqhgnxmotswjantxopb
# # Посмотреть Remote-версии
# $s = supabase migration list --db-url $env:DB_URL | Out-String
# $remote = ($s -split "`n" | ForEach-Object {
#   if ($_ -match '^\s*\S+\s*\|\s*(\S+)\s*\|') { $Matches[1] }
# }) | Where-Object { $_ } | Select-Object -Unique

# # Локальные префиксы из файлов
# $local = Get-ChildItem .\supabase\migrations -File -Filter *.sql | ForEach-Object {
#   if ($_.Name -match '^(\d{8,})_') { $Matches[1] }
# } | Select-Object -Unique

# # Создать заглушки для remote-only
# $missing = $remote | Where-Object { $_ -notin $local }
# foreach ($v in $missing) {
#   $path = ".\supabase\migrations\${v}_remote_noop.sql"
#   ni -ItemType File $path -Force | Out-Null
#   Set-Content $path "-- noop: aligns with remote $v"
#   Write-Host "Created $path"
# }

# # проверь коннект к пулеру (обязательно sslmode=require)




# # и так для каждого нужного файла

# $ErrorActionPreference = "Stop"

# # ===== НАСТРОЙКИ =====
# $QUICK        = $true      # быстрый режим: EXPLAIN без ANALYZE, минимум тяжёлых проверок
# $PSQL_TIMEOUT = "20"       # таймаут на каждый psql -c

# # Если env не выставлены — задаём явные дефолты (можно удалить если уже экспортируешь из Dash)
# if (-not $env:PGHOST)     { $env:PGHOST     = "aws-1-eu-central-1.pooler.supabase.com" }
# if (-not $env:PGPORT)     { $env:PGPORT     = "6543" }
# if (-not $env:PGUSER)     { $env:PGUSER     = "postgres.wsqhgnxmotswjantxopb" }
# if (-not $env:PGDATABASE) { $env:PGDATABASE = "postgres" }
# if (-not $env:PGSSLMODE)  { $env:PGSSLMODE  = "require" }
# # ВАЖНО: пароль задавай заранее: $env:PGPASSWORD="<DB_PASSWORD>"

# # Тестовые подстановки
# $TEST_IP_HASH = 'deadbeef'
# $TEST_SLUG    = 'lucky-star'

# # ===== СНОСИМ СТАРЫЕ ОТЧЁТЫ =====
# Get-ChildItem -Directory -Name "psql_reports*" -ErrorAction SilentlyContinue | ForEach-Object {
#   try { Remove-Item -Recurse -Force $_; Write-Host "🧹 Удалена старая папка: $_" -ForegroundColor Yellow }
#   catch { Write-Host "⚠️ Не удалось удалить $_ : $($_.Exception.Message)" -ForegroundColor Red }
# }



# # ===== ПАПКА ОТЧЁТОВ =====
# $ts = Get-Date -Format "yyyyMMdd_HHmmss"
# $reportDir = ".\psql_reports_$ts"
# New-Item -Force -ItemType Directory $reportDir | Out-Null

# function Run-Sql([string]$sql, [string]$outfile) {
#   $out = Join-Path $reportDir $outfile
#   $prefix = @"
# SET statement_timeout = '$PSQL_TIMEOUT';
# SET lock_timeout = '4s';
# SET idle_in_transaction_session_timeout = '10s';
# "@
#   if ($QUICK) {
#     $sql = $prefix + ($sql -replace 'EXPLAIN\s*\((?i:ANALYZE)[^)]*\)', 'EXPLAIN') `
#                      -replace 'EXPLAIN\s*\((?i:ANALYZE)\)', 'EXPLAIN' `
#                      -replace 'EXPLAIN\s+ANALYZE', 'EXPLAIN'
#   } else {
#     $sql = $prefix + $sql
#   }
#   & psql -v ON_ERROR_STOP=1 -P pager=off -c $sql 2>&1 | Out-File -Encoding utf8 $out
#   if ((Select-String -Path $out -Pattern 'ERROR:|FATAL:|statement timeout' -Quiet)) {
#     Write-Host ("❌ FAIL/Timeout: {0}" -f $outfile) -ForegroundColor Red
#   } else {
#     Write-Host ("✅ OK:   {0}" -f $outfile) -ForegroundColor Green
#   }
# }

# function Run-File([string]$sqlText, [string]$outfile) {
#   $tmp = [System.IO.Path]::GetTempFileName() + ".sql"
#   $sqlText | Out-File -Encoding utf8 $tmp
#   $out = Join-Path $reportDir $outfile
#   & psql -v ON_ERROR_STOP=1 -P pager=off -f $tmp 2>&1 | Out-File -Encoding utf8 $out
#   Remove-Item $tmp -ErrorAction SilentlyContinue
#   if (Select-String -Path $out -Pattern 'ERROR:|FATAL:' -Quiet) {
#     Write-Host ("❌ FAIL: {0}" -f $outfile) -ForegroundColor Red
#   } else {
#     Write-Host ("✅ OK:   {0}" -f $outfile) -ForegroundColor Green
#   }
# }

# Write-Host "== АУДИТ V2: $($env:PGHOST)/$($env:PGDATABASE) ==" -ForegroundColor Cyan

# # 0) Коннект/окружение
# Run-Sql @"
# SELECT current_user, current_database(), now();
# SHOW server_version;
# SELECT name, setting FROM pg_settings WHERE name IN ('search_path','timezone','standard_conforming_strings');
# "@ "00_connect_env.txt"

# # 1) Индексы и размеры таблиц (clicks/impressions)
# Run-Sql @"
# SELECT tablename,indexname,indexdef
# FROM pg_indexes
# WHERE schemaname='public' AND tablename IN ('clicks','impressions')
# ORDER BY tablename,indexname;
# "@ "10_indexes_clicks_impressions.txt"

# Run-Sql @"
# SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
# FROM pg_statio_user_tables
# WHERE relname IN ('clicks','impressions');
# "@ "11_table_sizes.txt"

# Run-Sql @"
# SELECT t.relname AS table, c.relname AS index, pg_size_pretty(pg_relation_size(c.oid)) AS idx_size
# FROM pg_class c
# JOIN pg_index i ON c.oid=i.indexrelid
# JOIN pg_class t ON t.oid=i.indrelid
# WHERE t.relname IN ('clicks','impressions')
# ORDER BY pg_relation_size(c.oid) DESC;
# "@ "12_index_sizes.txt"

# # 2) EXPLAIN (через offer_id, join по slug)
# Run-Sql @"
# EXPLAIN
# SELECT 1
# FROM public.clicks c
# JOIN public.offers o ON o.id = c.offer_id
# WHERE c.ip_hash = '$TEST_IP_HASH'
#   AND o.slug    = '$TEST_SLUG'
#   AND COALESCE(c.ts, c.created_at) >= now() - interval '5 seconds'
# LIMIT 1;
# "@ "30_explain_clicks.txt"

# Run-Sql @"
# EXPLAIN
# SELECT 1
# FROM public.impressions i
# JOIN public.offers o ON o.id = i.offer_id
# WHERE i.ip_hash = '$TEST_IP_HASH'
#   AND o.slug    = '$TEST_SLUG'
#   AND COALESCE(i.ts, i.created_at) >= now() - interval '1 hour'
# LIMIT 1;
# "@ "31_explain_impressions.txt"

# Run-Sql @"
# SELECT c.ip_hash, o.slug, c.ts
# FROM public.clicks c
# JOIN public.offers o ON o.id = c.offer_id
# ORDER BY c.ts DESC
# LIMIT 5;
# "@ "32_clicks_samples.txt"

# Run-Sql @"
# SELECT i.ip_hash, o.slug, i.ts
# FROM public.impressions i
# JOIN public.offers o ON o.id = i.offer_id
# ORDER BY i.ts DESC
# LIMIT 5;
# "@ "33_impressions_samples.txt"

# # 3) Favorites: PK & policies
# Run-Sql @"
# SELECT conname, pg_get_constraintdef(c.oid) AS def
# FROM pg_constraint c
# JOIN pg_class t ON t.oid=c.conrelid
# WHERE t.relname='favorites' AND contype='p';
# "@ "40_favorites_pk.txt"

# Run-Sql @"
# SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
# FROM pg_policies
# WHERE schemaname='public' AND tablename='favorites';
# "@ "41_favorites_policies.txt"

# # 4) RLS-проверка favorites с jwt
# Run-File @"
# BEGIN;
#   RESET ROLE;
#   SET ROLE authenticated;
#   SET request.jwt.claims = '{""sub"":""00000000-0000-0000-0000-000000000001""}';
#   SELECT COUNT(*) AS visible_rows FROM public.favorites WHERE user_id = auth.uid();
# ROLLBACK;
# "@ "42_rls_check.txt"

# # 5) Просроченные пины — до/после
# Run-Sql @"
# WITH x AS (
#   SELECT COUNT(*) c
#   FROM public.partner_offers po
#   JOIN public.partners p ON p.id = po.partner_id
#   WHERE po.pinned = TRUE
#     AND p.expires_at IS NOT NULL
#     AND p.expires_at <= now()
# )
# SELECT 'expired_pins_before' AS label, c FROM x;
# "@ "50_expired_pins_before.txt"

# Run-Sql "SELECT public.expire_partner_pins();" "51_expire_partner_pins_call.txt"

# Run-Sql @"
# WITH x AS (
#   SELECT COUNT(*) c
#   FROM public.partner_offers po
#   JOIN public.partners p ON p.id = po.partner_id
#   WHERE po.pinned = TRUE
#     AND p.expires_at IS NOT NULL
#     AND p.expires_at <= now()
# )
# SELECT 'expired_pins_after' AS label, c FROM x;
# "@ "52_expired_pins_after.txt"

# # 6) Использование индексов и hit-ratio
# Run-Sql @"
# SELECT relname AS table, indexrelname AS index, idx_scan, idx_tup_read, idx_tup_fetch
# FROM pg_stat_user_indexes
# WHERE relname IN ('clicks','impressions')
# ORDER BY relname, idx_scan DESC;
# "@ "13_index_stats.txt"

# Run-Sql @"
# SELECT relname,
#        heap_blks_read, heap_blks_hit,
#        round((heap_blks_hit+0.0)/NULLIF(heap_blks_hit+heap_blks_read,0),4) AS heap_hit_ratio
# FROM pg_statio_user_tables
# WHERE relname IN ('clicks','impressions')
# ORDER BY relname;
# "@ "14_heap_hit_ratio.txt"

# # 7) Нормализация policies favorites (оставляем 2: select own / write own)
# Run-File @"
# DO $$
# BEGIN
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites delete') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites delete')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites delete own') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites delete own')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites insert') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites insert')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites insert own') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites insert own')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites read') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites read')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites read own') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites read own')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites select own') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites select own')||' ON public.favorites';
#   END IF;
#   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites write own') THEN
#     EXECUTE 'DROP POLICY '||quote_ident('favorites write own')||' ON public.favorites';
#   END IF;
# END$$;

# ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

# CREATE POLICY "favorites select own"
#   ON public.favorites FOR SELECT
#   TO authenticated
#   USING (user_id = auth.uid());

# CREATE POLICY "favorites write own"
#   ON public.favorites FOR ALL
#   TO authenticated
#   USING (user_id = auth.uid())
#   WITH CHECK (user_id = auth.uid());
# "@ "41_favorites_policies_apply.txt"

# Run-Sql @"
# CREATE INDEX IF NOT EXISTS idx_favorites_user_created_at
# ON public.favorites (user_id, created_at DESC);
# "@ "41b_favorites_index.txt"

# Run-Sql @"
# SELECT policyname, roles, cmd, qual, with_check
# FROM pg_policies
# WHERE schemaname='public' AND tablename='favorites'
# ORDER BY policyname, cmd;
# "@ "41c_favorites_policies_after.txt"

# Run-File @"
# BEGIN;
#   RESET ROLE;
#   SET ROLE authenticated;
#   SET request.jwt.claims = '{""sub"":""00000000-0000-0000-0000-000000000001""}';
#   SELECT COUNT(*) AS visible_rows FROM public.favorites WHERE user_id = auth.uid();
# ROLLBACK;
# "@ "42_rls_check_after.txt"

# # 8) Stripe/Partners/Pins с JOIN по offer_id
# Run-Sql @"
# SELECT type, created_at
# FROM public.webhook_logs
# ORDER BY created_at DESC
# LIMIT 10;
# "@ "90_webhook_logs.txt"

# Run-Sql @"
# SELECT email, plan, expires_at, updated_at
# FROM public.partners
# ORDER BY updated_at DESC
# LIMIT 10;
# "@ "91_partners.txt"

# Run-Sql @"
# SELECT po.partner_id, o.slug AS offer_slug, po.pinned, po.created_at
# FROM public.partner_offers po
# JOIN public.offers o ON o.id = po.offer_id
# WHERE po.pinned = true
# ORDER BY po.created_at DESC
# LIMIT 10;
# "@ "92_partner_offers_pinned.txt"

# Write-Host "`n=== ГОТОВО. Отчёты в $reportDir ===" -ForegroundColor Cyan
$DbUser   = 'postgres.wsqhgnxmotswjantxopb'
$Password = 'e7TRclAGt7Yd3KEL'
$EscapedPass = [uri]::EscapeDataString($Password)
$GHost    = 'aws-1-eu-central-1.pooler.supabase.com'
$Port     = 6543
$DbName   = 'postgres'

$env:SUPABASE_DB_URL = "postgres://${DbUser}:${EscapedPass}@${GHost}:${Port}/${DbName}?sslmode=require&connect_timeout=5"



# Write-Host "SUPABASE_DB_URL=$env:SUPABASE_DB_URL"
# supabase login  "sbp_ce53a5a352b0b4aa136777956b6524c1ea9be208"  # возьмёт $SUPABASE_ACCESS_TOKEN
# supabase link --project-ref wsqhgnxmotswjantxopbF --debug

# # только структура (без данных)
# $env:PGSSLMODE='require'
# psql "postgres://postgres.wsqhgnxmotswjantxopb:e7TRclAGt7Yd3KEL@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require" ^
#   -c "select current_user, current_database();"  # проверка коннекта
# pg_dump "postgres://postgres.wsqhgnxmotswjantxopb:<PASSWOR@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require" `
#   -s -f ".\backup_before_include_all.sql"

$DbUser='postgres.wsqhgnxmotswjantxopb'
$Pass='e7TRclAGt7Yd3KEL'
$Esc=[uri]::EscapeDataString($Pass)
$GHost='aws-1-eu-central-1.pooler.supabase.com'
$Port=6543
$Db='postgres'
$env:SUPABASE_DB_URL = "postgresql://${DbUser}:${Esc}@${GHost}:${Port}/${Db}?sslmode=require&connect_timeout=5"
$env:SUPABASE_DB_URL

param(
  [string]$ProjectRef = "wsqhgnxmotswjantxopb",
  [string]$DbUser,
  [string]$Password,
  [int]$Port = 6543,
  [string]$DbName = "postgres",
  [string[]]$Hosts = @(
    "aws-1-eu-central-1.pooler.supabase.com",
    "3.71.225.44",
    "3.65.151.229"
  ),
  [switch]$NoPrompt,
  [switch]$Test
)

if (-not $DbUser -or $DbUser.Trim().Length -eq 0) {
  $DbUser = "postgres.$ProjectRef"
}

if (-not $Password -and -not $NoPrompt) {
  $sec = Read-Host "Введите пароль для $DbUser" -AsSecureString
  $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  )
}
if (-not $Password -or $Password.Trim().Length -eq 0) {
  Write-Error "Не задан пароль. Укажи параметр -Password или убери -NoPrompt."
  exit 1
}

Write-Host "Проверяю подключение к пулеру на порту $Port..." -ForegroundColor Cyan
$Alive = $null
foreach ($h in $Hosts) {
  $ok = Test-NetConnection $h -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
  if ($ok) { $Alive = $h; break }
}

if (-not $Alive) {
  Write-Error "Не удалось подключиться к ни одному из адресов: $($Hosts -join ', ')"
  exit 2
}

Write-Host "Выбран живой хост: $Alive" -ForegroundColor Green

# Собираем URL, здесь ${} гарантирует правильную подстановку
$Esc = [uri]::EscapeDataString(${Password})
$DbUrl = "postgresql://${DbUser}:$Esc@${Alive}:${Port}/${DbName}?sslmode=require&connect_timeout=5"

# Запоминаем в переменной окружения
$Env:SUPABASE_DB_URL = $DbUrl
Write-Host "SUPABASE_DB_URL установлен." -ForegroundColor Green
($DbUrl -replace '://([^:]+):([^@]+)@','://$1:***@')

if ($Test) {
  Write-Host "\nПробую psql -> select current_user, ssl_used, now();" -ForegroundColor Cyan
  $q = "select current_user, coalesce((select ssl from pg_stat_ssl where pid=pg_backend_pid()), false) as ssl_used, now();"
  psql "$Env:SUPABASE_DB_URL" -c $q
}


