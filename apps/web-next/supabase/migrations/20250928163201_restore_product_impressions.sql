-- Restore missing product_impressions table if it was dropped
DO $$
BEGIN
  IF to_regclass('public.product_impressions') IS NULL THEN
    CREATE TABLE public.product_impressions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      ip inet,
      user_agent text,
      referrer text,
      session_id text
    );

    ALTER TABLE public.product_impressions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can insert product impressions" ON public.product_impressions;
    CREATE POLICY "Anyone can insert product impressions" ON public.product_impressions
      FOR INSERT WITH CHECK (TRUE);

    CREATE INDEX IF NOT EXISTS product_impressions_product_created_idx
      ON public.product_impressions (product_id, created_at DESC);

    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT INSERT ON TABLE public.product_impressions TO anon, authenticated;
  END IF;
END
$$;
