-- Fix analytics MV migration for environments where `public.clicks`/`public.impressions` are VIEWS
-- Safe guards: only create base indexes when relation is a real TABLE, otherwise skip.

begin;

-- 0) Try to create helpful BRIN indexes only if relation is a heap table (relkind = 'r').
do $$
declare
  clicks_is_table boolean;
  impressions_is_table boolean;
begin
  select exists(
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'clicks' and c.relkind = 'r'
  ) into clicks_is_table;

  if clicks_is_table then
    execute 'create index if not exists clicks_ts_brin_idx on public.clicks using brin (ts) with (pages_per_range = 128)';
  end if;

  select exists(
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'impressions' and c.relkind = 'r'
  ) into impressions_is_table;

  if impressions_is_table then
    execute 'create index if not exists impressions_ts_brin_idx on public.impressions using brin (ts) with (pages_per_range = 128)';
  end if;
end $$;

-- 1) Daily aggregates (create if missing)
create materialized view if not exists public.clicks_by_day_mv as
select date_trunc('day', ts)::date as date, count(*)::bigint as count
from public.clicks
where ts >= now() - interval '180 days'
group by 1;

create index if not exists clicks_by_day_mv_date_idx on public.clicks_by_day_mv (date desc);

create materialized view if not exists public.impressions_by_day_mv as
select date_trunc('day', ts)::date as date, count(*)::bigint as count
from public.impressions
where ts >= now() - interval '180 days'
group by 1;

create index if not exists impressions_by_day_mv_date_idx on public.impressions_by_day_mv (date desc);

-- 2) Top slugs (clicks)
create materialized view if not exists public.top_slugs_clicks_mv as
select
  date_trunc('day', c.ts)::date as date,
  coalesce(nullif(trim(c.slug), ''), '-') as slug,
  count(*)::bigint as count
from public.clicks c
where c.ts >= now() - interval '180 days'
group by 1, 2;

create index if not exists top_slugs_clicks_mv_date_slug_idx on public.top_slugs_clicks_mv (date desc, slug);

-- 3) Top sources (clicks)
create materialized view if not exists public.top_sources_clicks_mv as
select
  date_trunc('day', c.ts)::date as date,
  coalesce(nullif(trim((c.params ->> 'utm_source')), ''), nullif(trim(c.referrer), ''), '-') as source,
  count(*)::bigint as count
from public.clicks c
where c.ts >= now() - interval '180 days'
group by 1, 2;

create index if not exists top_sources_clicks_mv_date_source_idx on public.top_sources_clicks_mv (date desc, source);

-- Helper function to refresh all analytics materialized views
create or replace function public.refresh_analytics_mviews()
returns void
language plpgsql
as $$
begin
  refresh materialized view public.clicks_by_day_mv;
  refresh materialized view public.impressions_by_day_mv;
  refresh materialized view public.top_slugs_clicks_mv;
  refresh materialized view public.top_sources_clicks_mv;
end;
$$;

commit;

