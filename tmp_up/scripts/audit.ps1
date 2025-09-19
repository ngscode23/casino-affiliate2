# scripts/audit.ps1
# Полный аудит БД (v2): роли, таблицы, колонки, индексы, RLS, политики, функции, данные, EXPLAIN.
# Запуск:
  $env:PGHOST='db.wsqhgnxmotswjantxopb.supabase.co'
  $env:PGPORT='6543'
  $env:PGUSER='postgres'
  $env:PGDATABASE='postgres'
  $env:PGSSLMODE='require'
  $env:PGPASSWORD='Stas_15082004Q'
#   ./scripts/audit.ps1
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20250905_rls_read_partners.sql



$ErrorActionPreference = "Stop"

# ===== ПАПКА ОТЧЁТОВ =====
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = ".\psql_reports_$ts"
New-Item -Force -ItemType Directory $reportDir | Out-Null

function Run-Sql([string]$sql, [string]$outfile) {
  $out = Join-Path $reportDir $outfile
  & psql -v ON_ERROR_STOP=1 -P pager=off -c $sql 2>&1 | Out-File -Encoding utf8 $out
  if ((Select-String -Path $out -Pattern 'ERROR:|FATAL:' -Quiet)) {
    Write-Host ("❌ FAIL: {0}" -f $outfile) -ForegroundColor Red
  } else {
    Write-Host ("✅ OK:   {0}" -f $outfile) -ForegroundColor Green
  }
}

# $env:PGPASSWORD="moo7QIZ8FVShZIl5"

function Run-File([string]$sql, [string]$outfile) {
  $out = Join-Path $reportDir $outfile
  & psql -v ON_ERROR_STOP=1 -P pager=off -f $sql 2>&1 | Out-File -Encoding utf8 $out
  if ((Select-String -Path $out -Pattern 'ERROR:|FATAL:' -Quiet)) {
    Write-Host ("❌ FAIL: {0}" -f $outfile) -ForegroundColor Red
  } else {
    Write-Host ("✅ OK:   {0}" -f $outfile) -ForegroundColor Green
  }
}

Write-Host "== АУДИТ V2: $env:PGHOST/$env:PGDATABASE ==" -ForegroundColor Cyan

# 0) Коннект и окружение
Run-Sql @"
SELECT current_user, current_database(), now();
SHOW server_version;
SELECT name, setting FROM pg_settings WHERE name IN ('search_path','timezone','standard_conforming_strings');
"@ "00_connect_env.txt"

# 1) Расширения (минимум пригодится)
Run-Sql @"
SELECT extname, extversion FROM pg_extension ORDER BY 1;
"@ "05_extensions.txt"

# 2) Роли (anon/authenticated/service_role)
Run-Sql @"
SELECT rolname, rolsuper, rolcanlogin FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role','postgres','app')
ORDER BY 1;
"@ "10_roles.txt"

# 3) Схемы, ключевые таблицы
Run-Sql @"
SELECT n.nspname AS schema, c.relname AS table, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
('offers','clicks','impressions','partners','partner_offers','favorites','compares','webhook_logs','public_settings','private_settings','settings')
ORDER BY 1,2;
"@ "20_tables_core.txt"

# 4) Колонки и nullability по ключевым таблицам
Run-Sql @"
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('offers','clicks','impressions','partners','partner_offers','favorites')
ORDER BY table_name, ordinal_position;
"@ "30_columns.txt"

# 5) Констрейнты: unique, FK, check
Run-Sql @"
-- offers.slug уникален и один
SELECT conname, contype, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid='public.offers'::regclass AND contype IN ('u','p','c')
ORDER BY 1;

-- партнерские FK
SELECT conname, contype, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid IN ('public.partner_offers'::regclass,'public.clicks'::regclass,'public.impressions'::regclass)
AND contype='f'
ORDER BY 1;
"@ "40_constraints.txt"

# 6) Индексы, которые должны быть в v2
Run-Sql @"
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('offers','clicks','impressions','partners','partner_offers')
ORDER BY 1,2;
"@ "50_indexes_all.txt"

# 6.1) Санити-чек конкретных v2 индексов
Run-Sql @"
WITH need(idx) AS (
  VALUES
  ('idx_clicks_ip_ts'),
  ('idx_clicks_offer_ts'),
  ('idx_offers_methods_gin'),
  ('idx_offers_enabled_position'),
  ('partner_offers_pinned_offer_id_idx'),
  ('partners_expires_at_active_idx')
)
SELECT n.idx AS expected_index,
       CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=n.idx)
            THEN 'present' ELSE 'missing' END AS status
FROM need n
ORDER BY 1;
"@ "51_indexes_expected.txt"

# 7) Триггеры updated_at (offers, partner_offers)
Run-Sql @"
SELECT event_object_table AS table, trigger_name, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table IN ('offers','partner_offers')
ORDER BY 1,2;
"@ "60_triggers.txt"

# 8) RLS включена и политики по таблицам
Run-Sql @"
-- включена ли RLS
SELECT relname AS table, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace='public'::regnamespace AND relkind='r'
  AND relname IN ('offers','clicks','impressions','favorites','partner_offers')
ORDER BY 1;

-- политики
SELECT polname AS policy, relname AS table, cmd, roles, permissive, polqual, polwithcheck
FROM pg_policies
WHERE schemaname='public'
  AND relname IN ('offers','clicks','impressions','favorites','partner_offers')
ORDER BY 2,1;
"@ "70_rls_policies.txt"

# 9) Функции pinned_*: безопасность и права
Run-Sql @"
SELECT n.nspname AS schema, p.proname AS func, pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' AS is_definer,
       pg_get_functiondef(p.oid) LIKE '%SECURITY INVOKER%' AS is_invoker,
       l.lanname AS lang
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.proname IN ('pinned_offer_slugs','pinned_offer_meta')
ORDER BY 2;

-- права на исполнение
SELECT n.nspname, p.proname, array_agg(r.rolname ORDER BY r.rolname) AS executors
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
LEFT JOIN pg_depend d ON d.objid=p.oid AND d.deptype='n'
LEFT JOIN pg_authid r ON has_function_privilege(r.oid, p.oid, 'EXECUTE')
WHERE n.nspname='public' AND p.proname IN ('pinned_offer_slugs','pinned_offer_meta')
GROUP BY 1,2
ORDER BY 2;
"@ "80_functions_pinned.txt"

# 10) Данные и витрина: pinned, counts
Run-Sql @"
SELECT count(*) AS offers_cnt FROM public.offers;
SELECT count(*) AS clicks_cnt FROM public.clicks;
SELECT count(*) AS impressions_cnt FROM public.impressions;
SELECT count(*) AS partners_cnt FROM public.partners;
SELECT count(*) AS partner_offers_cnt FROM public.partner_offers;
"@ "90_counts.txt"

Run-Sql @"
-- pinned slugs (если функция есть)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='pinned_offer_slugs' AND pronamespace='public'::regnamespace)
  THEN RAISE NOTICE 'Pinned: %',(SELECT string_agg(s, ',') FROM public.pinned_offer_slugs() s);
  END IF;
END $$;
"@ "91_pinned_notice.txt"

Run-Sql @"
-- последние пины
SELECT o.slug, po.pinned, p.plan, p.expires_at
FROM public.partner_offers po
JOIN public.offers o ON o.id=po.offer_id
JOIN public.partners p ON p.id=po.partner_id
WHERE po.pinned = true
ORDER BY po.created_at DESC
LIMIT 20;
"@ "92_pins_sample.txt"

# 11) Перфоманс: планы по ключевым запросам
Run-Sql @"
EXPLAIN (ANALYZE, BUFFERS)
SELECT 1
FROM public.clicks
WHERE offer_id IS NOT NULL
  AND ip_hash = 'deadbeef'
  AND ts > now() - interval '7 days'
LIMIT 1;
"@ "95_explain_clicks_ip_offer.txt"

Run-Sql @"
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.slug, count(c.id)
FROM public.offers o
LEFT JOIN public.clicks c ON c.offer_id=o.id
  AND c.ts >= date_trunc('day', now() - interval '14 days')
GROUP BY o.slug
ORDER BY 2 DESC
LIMIT 10;
"@ "96_explain_top_offers.txt"

# 12) Сигнатуры проблем: легаси-столбцы/индексы, которых быть не должно
Run-Sql @"
WITH legacy(name, present) AS (
  VALUES
  ('clicks.slug', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clicks' AND column_name='slug')),
  ('impressions.referer', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='impressions' AND column_name='referer')),
  ('clicks_slug_ts_idx', EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='clicks_slug_ts_idx'))
)
SELECT * FROM legacy ORDER BY 1;
"@ "97_legacy_signatures.txt"

Write-Host "`n=== ГОТОВО. Отчёты в $reportDir ===" -ForegroundColor Cyan