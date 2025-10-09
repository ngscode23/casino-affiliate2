-- Aggregated metrics functions for admin metrics API
-- Groups are computed in SQL to avoid scanning large raw tables from the app.

-- Daily clicks between _from and _to (UTC day buckets)
create or replace function public.clicks_daily(
  _from timestamptz,
  _to   timestamptz
) returns table(
  date  date,
  count bigint
) language sql stable as $$
  select (ts at time zone 'UTC')::date as date,
         count(*)::bigint as count
  from public.clicks
  where ts >= _from and ts <= _to
  group by 1
  order by 1;
$$;

-- Top offers (slug) with share across the selected period
create or replace function public.top_offers_with_share(
  _from  timestamptz,
  _to    timestamptz,
  _limit int default 20
) returns table(
  slug  text,
  count bigint,
  share numeric
) language sql stable as $$
  with grouped as (
    select coalesce(nullif(trim(slug), ''), '-') as slug,
           count(*)::bigint as cnt
    from public.clicks
    where ts >= _from and ts <= _to
    group by 1
  )
  select g.slug,
         g.cnt as count,
         (g.cnt::numeric / nullif(sum(g.cnt) over (), 0)) as share
  from grouped g
  order by g.cnt desc
  limit coalesce(_limit, 20);
$$;

-- Optional: grant execute to anon/authenticated if needed; admin API is protected anyway.
-- grant execute on function public.clicks_daily(timestamptz, timestamptz) to authenticated, anon;
-- grant execute on function public.top_offers_with_share(timestamptz, timestamptz, int) to authenticated, anon;

