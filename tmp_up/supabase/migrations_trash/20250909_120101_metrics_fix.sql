-- Снести старую версию, если с такой сигнатурой уже была
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'metrics_clicks_top_offers'
      AND pg_get_function_identity_arguments(p.oid) = 'integer'
  ) THEN
    DROP FUNCTION public.metrics_clicks_top_offers(integer);
  END IF;
END $$;

-- Топ кликов по офферам за N дней, join по slug (в clicks НЕТ offer_id)
CREATE OR REPLACE FUNCTION public.metrics_clicks_top_offers(p_days int DEFAULT 14)
RETURNS TABLE (slug text, clicks bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      GREATEST(1, LEAST(60, COALESCE(p_days, 14)))::int AS days,
      timezone('utc', now()) AS now_utc
  )
  SELECT o.slug, COUNT(*)::bigint AS clicks
  FROM public.clicks c
  JOIN public.offers o
    ON o.slug = c.slug
  WHERE COALESCE(c.created_at, c.ts) >= (
    SELECT now_utc - make_interval(days => days) FROM params
  )
  GROUP BY o.slug
  ORDER BY clicks DESC, o.slug ASC
  LIMIT 100
$$;

-- (если у тебя есть аналогичная функция для показов — раскомментируй блок ниже)
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public'
--       AND p.proname = 'metrics_impressions_top_offers'
--       AND pg_get_function_identity_arguments(p.oid) = 'integer'
--   ) THEN
--     DROP FUNCTION public.metrics_impressions_top_offers(integer);
--   END IF;
-- END $$;
--
-- CREATE OR REPLACE FUNCTION public.metrics_impressions_top_offers(p_days int DEFAULT 14)
-- RETURNS TABLE (slug text, impressions bigint)
-- LANGUAGE sql
-- STABLE
-- SET search_path = public
-- AS $$
--   WITH params AS (
--     SELECT GREATEST(1, LEAST(60, COALESCE(p_days, 14)))::int AS days,
--            timezone('utc', now()) AS now_utc
--   )
--   SELECT o.slug, COUNT(*)::bigint AS impressions
--   FROM public.impressions i
--   JOIN public.offers o ON o.slug = i.slug
--   WHERE COALESCE(i.created_at, i.ts) >= (
--     SELECT now_utc - make_interval(days => days) FROM params
--   )
--   GROUP BY o.slug
--   ORDER BY impressions DESC, o.slug ASC
--   LIMIT 100
-- $$;