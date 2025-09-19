-- Безопасно переопределяем функции под join по slug
-- Если раньше сигнатуры были иные — сначала дропаем по точной сигнатуре

DROP FUNCTION IF EXISTS public.metrics_clicks_daily(integer);
CREATE OR REPLACE FUNCTION public.metrics_clicks_daily(p_days int DEFAULT 14)
RETURNS TABLE (date text, count bigint)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT
      GREATEST(1, LEAST(60, COALESCE(p_days, 14)))::int AS days,
      timezone('utc', now()) AS now_utc,
      (timezone('utc', now()))::date AS today_utc
  ), since AS (
    SELECT (now_utc - (days || ' days')::interval) AS since_utc, days, today_utc FROM params
  ), counts AS (
    SELECT (timezone('utc', COALESCE(c.ts, now())))::date AS d, COUNT(*)::bigint AS c
    FROM public.clicks c, since s
    WHERE COALESCE(c.created_at, c.ts) >= s.since_utc
    GROUP BY 1
  ), series AS (
    SELECT generate_series(s.today_utc - (s.days - 1), s.today_utc, '1 day')::date AS d FROM since s
  )
  SELECT to_char(s.d, 'YYYY-MM-DD') AS date, COALESCE(c.c, 0) AS count
  FROM series s
  LEFT JOIN counts c USING (d)
  ORDER BY s.d ASC;
$$;

DROP FUNCTION IF EXISTS public.metrics_clicks_top_offers(integer);
CREATE OR REPLACE FUNCTION public.metrics_clicks_top_offers(p_days int DEFAULT 14)
RETURNS TABLE (slug text, count bigint)
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT GREATEST(1, LEAST(60, COALESCE(p_days, 14)))::int AS days,
           timezone('utc', now()) AS now_utc
  )
  SELECT o.slug AS slug, COUNT(*)::bigint AS count
  FROM public.clicks c
  JOIN public.offers o ON o.slug = c.slug
  , params p
  WHERE COALESCE(c.created_at, c.ts) >= (p.now_utc - (p.days || ' days')::interval)
  GROUP BY o.slug
  ORDER BY count DESC, slug ASC
  LIMIT 10;
$$;