-- metrics v2: считаем по offer_id, slug берём из offers

-- суточные клики за N дней
create or replace function public.metrics_clicks_daily(p_days int default 14)
returns table (date text, count bigint)
language sql
stable
set search_path = public
as $$
  with params as (
    select greatest(1, least(60, coalesce(p_days, 14)))::int as days,
           timezone('utc', now()) as now_utc,
           (timezone('utc', now()))::date as today_utc
  ), since as (
    select (now_utc - (days || ' days')::interval) as since_utc, days, today_utc from params
  ), counts as (
    select (timezone('utc', coalesce(c.created_at, c.ts)))::date as d,
           count(*)::bigint as c
    from public.clicks c, since s
    where coalesce(c.created_at, c.ts) >= s.since_utc
    group by 1
  ), series as (
    select generate_series(s.today_utc - (s.days - 1), s.today_utc, '1 day')::date as d
    from since s
  )
  select to_char(s.d, 'YYYY-MM-DD') as date, coalesce(c.c, 0) as count
  from series s
  left join counts c using (d)
  order by s.d asc
$$;

-- топ офферов за N дней (join по offer_id -> slug)
create or replace function public.metrics_clicks_top_offers(p_days int default 14)
returns table (slug text, count bigint)
language sql
stable
set search_path = public
as $$
  with params as (
    select greatest(1, least(60, coalesce(p_days, 14)))::int as days,
           timezone('utc', now()) as now_utc
  )
  select o.slug, count(*)::bigint as count
  from public.clicks c
  join public.offers o on o.id = c.offer_id
  , params p
  where coalesce(c.created_at, c.ts) >= (p.now_utc - (p.days || ' days')::interval)
  group by o.slug
  order by count desc, o.slug asc
  limit 10
$$;