-- scripts/sql/task_v2_rls_service_role.sql
-- RLS test under role service_role
\set ON_ERROR_STOP on

-- Phase 1: insert a click and COMMIT so metrics can observe it
BEGIN;
  SET LOCAL ROLE service_role;

  DO $$
  DECLARE v_offer_id bigint;
  BEGIN
    SELECT id INTO v_offer_id FROM public.offers WHERE slug IN ('lucky-star','unknown') ORDER BY CASE WHEN slug='lucky-star' THEN 0 ELSE 1 END LIMIT 1;
    IF v_offer_id IS NULL THEN
      INSERT INTO public.offers(slug, name, link, enabled, methods, license)
      VALUES ('unknown','Unknown Offer','https://example.com', true, '{}'::text[], 'Other')
      RETURNING id INTO v_offer_id;
    END IF;

    BEGIN
      INSERT INTO public.clicks(offer_id, ts, ip_hash, params)
      VALUES (v_offer_id, now(), 'deadbeef', '{}'::jsonb);
      RAISE NOTICE 'insert click: OK (offer_id=%)', v_offer_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'insert click: FAIL: %', SQLERRM;
    END;
  END $$;
COMMIT;

-- Phase 2: optional favorites insert under service role, rolled back
BEGIN;
  SET LOCAL ROLE service_role;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO public.favorites(user_id, offer_id, created_at)
      VALUES ('00000000-0000-0000-0000-000000000001', 'unknown', now())
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'insert favorite as service_role: OK (service policy present)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'insert favorite as service_role: FAIL (policy absent): %', SQLERRM;
    END;
  END $$;
ROLLBACK;
