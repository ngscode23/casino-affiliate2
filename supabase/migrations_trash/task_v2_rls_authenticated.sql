-- scripts/sql/task_v2_rls_authenticated.sql
-- RLS test under role authenticated with fake JWT claims
\set ON_ERROR_STOP on

BEGIN;
  SET LOCAL ROLE authenticated;
  -- sub = 000...001
  SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

  -- Ensure dependent profile exists to satisfy optional FK
  INSERT INTO public.profiles(id)
  VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

  -- Insert own favorite
  DO $$
  BEGIN
    BEGIN
      INSERT INTO public.favorites(user_id, offer_id, created_at)
      VALUES (auth.uid(), 'unknown', now())
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'insert own: OK';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'insert own: FAIL: %', SQLERRM;
    END;
  END $$;

  -- Insert foreign user favorite (should fail via RLS)
  DO $$
  BEGIN
    BEGIN
      INSERT INTO public.favorites(user_id, offer_id, created_at)
      VALUES ('00000000-0000-0000-0000-000000000002', 'unknown', now());
      RAISE NOTICE 'insert foreign: OK (unexpected)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'insert foreign: FAIL as expected: %', SQLERRM;
    END;
  END $$;

  -- Read back only own
  SELECT 'own_count' AS label, count(*) AS count
  FROM public.favorites
  WHERE user_id = auth.uid();

ROLLBACK;

