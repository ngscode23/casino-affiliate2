-- Verify core schema, policies, indexes and roles
-- Outputs a list of checks with ok/fail status and short details

\pset tuples_only on
\pset format aligned

with checks as (
  -- Roles
  select 'role anon exists' as check_name, (exists (select 1 from pg_roles where rolname='anon')) as ok, null::text as detail
  union all select 'role authenticated exists', (exists (select 1 from pg_roles where rolname='authenticated')), null
  union all select 'role service_role exists', (exists (select 1 from pg_roles where rolname='service_role')), null

  -- Tables
  union all select 'table public.offers exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='offers')), null
  union all select 'table public.clicks exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='clicks')), null
  union all select 'table public.impressions exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='impressions')), null
  union all select 'table public.partners exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='partners')), null
  union all select 'table public.partner_offers exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='partner_offers')), null
  union all select 'table public.favorites exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='favorites')), null
  union all select 'table public.compares exists', (exists (select 1 from information_schema.tables where table_schema='public' and table_name='compares')), null

  -- offers constraints/columns
  union all select 'offers.slug unique (offers_slug_key)', (exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='u' and c.conname='offers_slug_key'
  )), null
  union all select 'offers.license CHECK (offers_license_check)', (exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='c' and c.conname='offers_license_check'
  )), null
  union all select 'offers.created_at not null', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='offers' and column_name='created_at' and is_nullable='NO'
  )), null
  union all select 'offers.updated_at not null', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='offers' and column_name='updated_at' and is_nullable='NO'
  )), null
  union all select 'offers updated_at trigger present', (exists (
    select 1 from pg_trigger tr
    join pg_class t on t.oid=tr.tgrelid
    where t.relname='offers' and tr.tgenabled <> 'D' and tgname='trg_offers_updated_at'
  )), null

  -- impressions columns
  union all select 'impressions.referrer exists', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='impressions' and column_name='referrer'
  )), null
  union all select 'impressions.referer absent', (not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='impressions' and column_name='referer'
  )), null

  -- clicks columns/defaults
  union all select 'clicks.id identity or default', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clicks' and column_name='id'
      and (is_identity='YES' or column_default is not null)
  )), null
  union all select 'clicks.offer_id not null', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clicks' and column_name='offer_id' and is_nullable='NO'
  )), null
  union all select 'clicks.params not null', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clicks' and column_name='params' and is_nullable='NO'
  )), null
  union all select 'clicks.ts exists', (exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clicks' and column_name='ts'
  )), null

  -- indexes
  union all select 'index idx_clicks_ip_ts exists', (exists (
    select 1 from pg_indexes where schemaname='public' and tablename='clicks' and indexname='idx_clicks_ip_ts'
  )), null
  union all select 'index idx_offers_methods_gin exists', (exists (
    select 1 from pg_indexes where schemaname='public' and tablename='offers' and indexname='idx_offers_methods_gin'
  )), null

  -- RLS enabled
  union all select 'RLS enabled on offers', (exists (
    select 1 from pg_class where relnamespace = 'public'::regnamespace and relname='offers' and relrowsecurity
  )), null
  union all select 'RLS enabled on clicks', (exists (
    select 1 from pg_class where relnamespace = 'public'::regnamespace and relname='clicks' and relrowsecurity
  )), null

  -- policies present/absent
  union all select 'policy offers_read_public present', (exists (
    select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_read_public'
  )), null
  union all select 'policy offers_write_service present', (exists (
    select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_write_service'
  )), null
  union all select 'policy clicks_select_authenticated present', (exists (
    select 1 from pg_policies where schemaname='public' and tablename='clicks' and policyname='clicks_select_authenticated'
  )), null
  union all select 'policy clicks_insert_service present', (exists (
    select 1 from pg_policies where schemaname='public' and tablename='clicks' and policyname='clicks_insert_service'
  )), null
  union all select 'no anon INSERT on clicks', (not exists (
    select 1 from pg_policies p
    where p.schemaname='public' and p.tablename='clicks' and p.cmd='INSERT'
      and array_position(p.roles,'anon') is not null
  )), null
)
select check_name,
       case when ok then 'ok' else 'fail' end as status,
       coalesce(detail,'') as detail
from checks
order by ok asc, check_name asc;

\pset tuples_only off
