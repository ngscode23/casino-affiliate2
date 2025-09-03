

# ===== НАСТРОЙКА =====
$env:PGHOST     = 'db.wsqhgnxmotswjantxopb.supabase.co'
$env:PGPORT     = '5432'
$env:PGUSER     = 'postgres'
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE  = 'require'
$env:PGPASSWORD =  "Stas_15082004Q" # <-- обязателен

# тестовые значения для EXPLAIN (замени реальными позже)
$TEST_IP_HASH = 'deadbeef'
$TEST_SLUG    = 'lucky-star'

# ===== ПАПКА ОТЧЁТОВ =====
$reportDir = ".\psql_reports"
if (Test-Path $reportDir) { Remove-Item -Recurse -Force $reportDir }
New-Item -Force -ItemType Directory $reportDir | Out-Null

# ===== ХЕЛПЕР =====
function Run-Sql([string]$sql, [string]$outfile) {
  $out = Join-Path $reportDir $outfile
  # & — явный вызов команды. 2>&1 — слить stderr в stdout. Out-File — в UTF-8.
  & psql -v ON_ERROR_STOP=1 -c $sql 2>&1 | Out-File -Encoding utf8 $out
  if ((Get-Content $out -TotalCount 1) -match 'ERROR:|FATAL:') {
    Write-Host "❌ FAIL: $outfile" -ForegroundColor Red
  } else {
    Write-Host "✅ OK:   $outfile" -ForegroundColor Green
  }
}

# ===== 0) КОННЕКТ =====
Run-Sql "SELECT current_user, current_database(), now();" "00_connect.txt"

# ===== 1) ИНВЕНТАРИЗАЦИЯ =====
Run-Sql @"
SELECT tablename,indexname,indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('clicks','impressions')
ORDER BY tablename,indexname;
"@ "10_indexes_clicks_impressions.txt"

Run-Sql @"
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_statio_user_tables
WHERE relname IN ('clicks','impressions');
"@ "11_table_sizes.txt"

Run-Sql @"
SELECT t.relname AS table, c.relname AS index, pg_size_pretty(pg_relation_size(c.oid)) AS idx_size
FROM pg_class c
JOIN pg_index i ON c.oid=i.indexrelid
JOIN pg_class t ON t.oid=i.indrelid
WHERE t.relname IN ('clicks','impressions')
ORDER BY pg_relation_size(c.oid) DESC;
"@ "12_index_sizes.txt"

# ===== 2) ИНДЕКСЫ (CONCURRENTLY) =====
Run-Sql "CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_ip_slug_ts_idx ON public.clicks (ip_hash, slug, ts DESC);" "20_create_idx_clicks.txt"
Run-Sql "CREATE INDEX CONCURRENTLY IF NOT EXISTS impressions_ip_slug_ts_idx ON public.impressions (ip_hash, slug, ts DESC);" "21_create_idx_impressions.txt"
Run-Sql @"
SELECT tablename,indexname,indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('clicks','impressions')
ORDER BY tablename,indexname;
"@ "22_indexes_after.txt"

# ===== 3) EXPLAIN =====
Run-Sql @"
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1
FROM public.clicks
WHERE ip_hash = '$TEST_IP_HASH'
  AND slug     = '$TEST_SLUG'
  AND ts >= now() - interval '5 seconds'
LIMIT 1;
"@ "30_explain_clicks.txt"

Run-Sql @"
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1
FROM public.impressions
WHERE ip_hash = '$TEST_IP_HASH'
  AND slug     = '$TEST_SLUG'
  AND ts >= now() - interval '1 hour'
LIMIT 1;
"@ "31_explain_impressions.txt"

# На всякий случай снимем последние значения для подстановки позже
Run-Sql "SELECT ip_hash, slug, ts FROM public.clicks ORDER BY ts DESC LIMIT 5;" "32_clicks_samples.txt"
Run-Sql "SELECT ip_hash, slug, ts FROM public.impressions ORDER BY ts DESC LIMIT 5;" "33_impressions_samples.txt"

# ===== 4) FAVORITES: PK и ПОЛИТИКИ =====
Run-Sql @"
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid=c.conrelid
WHERE t.relname='favorites' AND contype='p';
"@ "40_favorites_pk.txt"

Run-Sql @"
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='favorites';
"@ "41_favorites_policies.txt"

# ===== 5) RLS-ПРОВЕРКА (в транзакции, через файл) =====
$rlsSql = @"
BEGIN;
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
  SELECT COUNT(*) AS visible_rows FROM public.favorites WHERE user_id = auth.uid();
ROLLBACK;
"@
$rlsFile = Join-Path $reportDir "42_rls_check.sql"
$rlsOut  = Join-Path $reportDir "42_rls_check.txt"
$rlsSql | Out-File -Encoding utf8 $rlsFile
# тут тоже без Start-Process
& psql -v ON_ERROR_STOP=1 -f $rlsFile 2>&1 | Out-File -Encoding utf8 $rlsOut
Remove-Item $rlsFile -ErrorAction SilentlyContinue
if ((Get-Content $rlsOut -TotalCount 1) -match 'ERROR:|FATAL:') {
  Write-Host "❌ FAIL: 42_rls_check.txt" -ForegroundColor Red
} else {
  Write-Host "✅ OK:   42_rls_check.txt" -ForegroundColor Green
}

# ===== 6) СНЯТИЕ ПИНОВ =====
Run-Sql @"
WITH x AS (
  SELECT COUNT(*) c
  FROM public.partner_offers po
  JOIN public.partners p ON p.id = po.partner_id
  WHERE po.pinned = TRUE
    AND p.expires_at IS NOT NULL
    AND p.expires_at <= now()
)
SELECT 'expired_pins_before' AS label, c FROM x;
"@ "50_expired_pins_before.txt"

Run-Sql "SELECT public.expire_partner_pins();" "51_expire_partner_pins_call.txt"

Run-Sql @"
WITH x AS (
  SELECT COUNT(*) c
  FROM public.partner_offers po
  JOIN public.partners p ON p.id = po.partner_id
  WHERE po.pinned = TRUE
    AND p.expires_at IS NOT NULL
    AND p.expires_at <= now()
)
SELECT 'expired_pins_after' AS label, c FROM x;
"@ "52_expired_pins_after.txt"



# ================== 7) INDEX STATS (использование индексов и hit-ratio) ==================
Run-Sql @"
SELECT relname AS table,
       indexrelname AS index,
       idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname IN ('clicks','impressions')
ORDER BY relname, idx_scan DESC;
"@ "13_index_stats.txt"

Run-Sql @"
SELECT relname,
       heap_blks_read, heap_blks_hit,
       round((heap_blks_hit+0.0)/NULLIF(heap_blks_hit+heap_blks_read,0),4) AS heap_hit_ratio
FROM pg_statio_user_tables
WHERE relname IN ('clicks','impressions')
ORDER BY relname;
"@ "14_heap_hit_ratio.txt"

# ================== 8) FAVORITES POLICIES (нормализация без простоя) ==================

# 8.1 Применение: чистим дубли через DO $$ и создаём 2 политики
$sqlPolicies = @'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites delete') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites delete')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites delete own') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites delete own')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites insert') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites insert')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites insert own') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites insert own')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites read') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites read')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites read own') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites read own')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites select own') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites select own')||' ON public.favorites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites write own') THEN
    EXECUTE 'DROP POLICY '||quote_ident('favorites write own')||' ON public.favorites';
  END IF;
END$$;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites select own"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorites write own"
  ON public.favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
'@

Run-Sql $sqlPolicies "41_favorites_policies_apply.txt"

# 8.2 Индекс для списка пользователя
$sqlFavIdx = @'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_created_at
ON public.favorites (user_id, created_at DESC);
'@
Run-Sql $sqlFavIdx "41b_favorites_index.txt"

# 8.3 Список политик после правок
$sqlPoliciesAfter = @'
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='favorites'
ORDER BY policyname, cmd;
'@
Run-Sql $sqlPoliciesAfter "41c_favorites_policies_after.txt"

# 8.4 Проверка RLS с JWT
$rlsAfter = @"
BEGIN;
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{""sub"":""00000000-0000-0000-0000-000000000001""}';
  SELECT COUNT(*) AS visible_rows FROM public.favorites WHERE user_id = auth.uid();
ROLLBACK;
"@
$rlsAfterFile = Join-Path $reportDir "42_rls_check_after.sql"
$rlsAfterOut  = Join-Path $reportDir "42_rls_check_after.txt"
$rlsAfter | Out-File -Encoding utf8 $rlsAfterFile
& psql -v ON_ERROR_STOP=1 -f $rlsAfterFile 2>&1 | Out-File -Encoding utf8 $rlsAfterOut
Remove-Item $rlsAfterFile -ErrorAction SilentlyContinue
if ((Get-Content $rlsAfterOut -TotalCount 1) -match 'ERROR:|FATAL:') { Write-Host "❌ 42_rls_check_after.txt" -ForegroundColor Red } else { Write-Host "✅ 42_rls_check_after.txt" -ForegroundColor Green }


# ================== 9) STRIPE / PARTNERS / PINS CHECKS ==================
Run-Sql @'
select type, created_at
from public.webhook_logs
order by created_at desc
limit 10;
'@ "90_webhook_logs.txt"

Run-Sql @'
select email, plan, expires_at, updated_at
from public.partners
order by updated_at desc
limit 10;
'@ "91_partners.txt"

Run-Sql @'
select partner_id, offer_slug, pinned, created_at
from public.partner_offers
where pinned = true
order by created_at desc
limit 10;
'@ "92_partner_offers_pinned.txt"





