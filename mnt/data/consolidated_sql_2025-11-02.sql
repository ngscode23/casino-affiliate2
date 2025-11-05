-- Consolidated SQL applied on 2025-11-02
-- NOTE: This file includes only the statements I explicitly executed in this session.
-- Some earlier migrations listed by your project may pre-exist and are not reproduced here.

--------------------------------------------------------------------------------
-- 20251102_create_pgss_snapshot_table
--------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS dba;
CREATE TABLE IF NOT EXISTS dba.pgss_snap (
  snap_ts timestamptz NOT NULL,
  queryid bigint NOT NULL,
  calls bigint,
  total_exec_time double precision,
  mean_exec_time double precision,
  min_exec_time double precision,
  max_exec_time double precision,
  stddev_exec_time double precision,
  rows bigint,
  shared_blks_read bigint,
  shared_blks_hit bigint,
  query text
);
CREATE INDEX IF NOT EXISTS idx_pgss_snap_ts ON dba.pgss_snap(snap_ts);
CREATE INDEX IF NOT EXISTS idx_pgss_snap_queryid ON dba.pgss_snap(queryid);

--------------------------------------------------------------------------------
-- 20251102_normalize_currency_in_place_order_with_items_and_cleanup
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order_with_items(
  p_user_id uuid,
  p_items jsonb,
  p_currency text DEFAULT 'USD'::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_currency text := upper(substr(coalesce(p_currency,'USD'),1,3));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.currencies c WHERE c.code = v_currency) THEN
    RAISE EXCEPTION 'unsupported_currency: %', v_currency USING errcode = '22023';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_order_payload' USING errcode = '22023';
  END IF;

  INSERT INTO public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  VALUES (p_user_id, 'pending', 0, 0, 0, 0, v_currency)
  RETURNING id INTO v_order_id;

  WITH src AS (
    SELECT (i->>'id')::uuid AS product_id,
           GREATEST(1, COALESCE((i->>'qty')::int, 1)) AS qty
    FROM jsonb_array_elements(p_items) i
  ), agg AS (
    SELECT product_id, SUM(qty) AS qty
    FROM src GROUP BY product_id
  ), joined AS (
    SELECT a.product_id, a.qty, p.title, p.price::numeric(10,2) AS unit_price
    FROM agg a
    JOIN public.ecom_products p ON p.id = a.product_id
  )
  INSERT INTO public.order_items (order_id, product_id, title, qty, unit_price)
  SELECT v_order_id, j.product_id, COALESCE(j.title, ''), j.qty, j.unit_price
  FROM joined j;

  SELECT COALESCE(SUM(oi.total), 0)::numeric(10,2) INTO v_subtotal
  FROM public.order_items oi WHERE oi.order_id = v_order_id;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      grand_total = v_subtotal
  WHERE id = v_order_id;

  IF (SELECT grand_total FROM public.orders WHERE id = v_order_id) <= 0 THEN
    DELETE FROM public.order_items WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'order_total_zero_after_insert' USING errcode = '22023';
  END IF;

  RETURN v_order_id;
END;
$$;

DROP FUNCTION IF EXISTS public.place_order_with_items(jsonb);

CREATE OR REPLACE FUNCTION public.place_order(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE v_id uuid; BEGIN
  RAISE NOTICE 'place_order is deprecated, use place_order_with_items';
  INSERT INTO public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  VALUES (p_user_id, 'pending', 0, 0, 0, 0, 'USD')
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;

--------------------------------------------------------------------------------
-- 20251102_cms_part1_roles_and_helpers
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.cms_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_roles_role ON public.cms_roles(role);

CREATE OR REPLACE FUNCTION public.cms_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
  SELECT COALESCE(
    (auth.role() = 'service_role')
    OR EXISTS (SELECT 1 FROM public.admin_emails ae WHERE lower(ae.email) = lower(coalesce(auth.jwt()->>'email','')))
    OR EXISTS (SELECT 1 FROM public.cms_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')
  , false);
$$;

CREATE OR REPLACE FUNCTION public.cms_is_editor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
  SELECT COALESCE(
    public.cms_is_admin() OR EXISTS (SELECT 1 FROM public.cms_roles r WHERE r.user_id = auth.uid() AND r.role = 'editor')
  , false);
$$;

--------------------------------------------------------------------------------
-- 20251102_cms_part2_tables
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id),
  PRIMARY KEY (key, locale)
);
CREATE INDEX IF NOT EXISTS idx_site_settings_locale ON public.site_settings(locale);

CREATE TABLE IF NOT EXISTS public.navigation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL DEFAULT 'en',
  menu text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  is_external boolean NOT NULL DEFAULT false,
  parent_id uuid NULL REFERENCES public.navigation_links(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_nav_links_menu_locale ON public.navigation_links(menu, locale);
CREATE INDEX IF NOT EXISTS idx_nav_links_published_sort ON public.navigation_links(published, sort_order);

CREATE TABLE IF NOT EXISTS public.content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL DEFAULT 'en',
  type text NOT NULL,
  slug text NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_content_blocks_locale_status ON public.content_blocks(locale, status);

CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  block_id uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_draft boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_page_sections_key ON public.page_sections(page_path, locale, sort_order);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'public-media',
  storage_key text NOT NULL,
  mime_type text NULL,
  width int NULL,
  height int NULL,
  size_bytes bigint NULL,
  alt text NULL,
  description text NULL,
  uploaded_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  checksum text NULL,
  UNIQUE(bucket, storage_key)
);
CREATE INDEX IF NOT EXISTS idx_media_bucket_key ON public.media_assets(bucket, storage_key);

CREATE TABLE IF NOT EXISTS public.content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table text NOT NULL,
  target_id uuid NULL,
  target_key text NULL,
  locale text NULL,
  snapshot jsonb NOT NULL,
  author uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text NULL
);

CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL,
  action text NOT NULL DEFAULT 'revalidate',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON public.publish_jobs(status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.form_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  locale text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid NULL REFERENCES auth.users(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','processing','done','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_form_entries_form ON public.form_entries(form_id, submitted_at);

CREATE TABLE IF NOT EXISTS public.feature_toggles (
  key text PRIMARY KEY,
  description text NULL,
  value_bool boolean NULL,
  value_json jsonb NULL,
  is_public boolean NOT NULL DEFAULT true,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.scheduled_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  publish_at timestamptz NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_time ON public.scheduled_content(publish_at);

--------------------------------------------------------------------------------
-- 20251102_cms_part3_rls_views_functions
--------------------------------------------------------------------------------
ALTER TABLE public.cms_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['site_settings','navigation_links','content_blocks','page_sections','media_assets','content_revisions','publish_jobs','form_templates','form_entries','feature_toggles','scheduled_content','cms_roles']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS cms_admin_editor_all ON public.%I', t);
    EXECUTE format('CREATE POLICY cms_admin_editor_all ON public.%I FOR ALL USING (public.cms_is_editor()) WITH CHECK (public.cms_is_editor())', t);
  END LOOP; END $$;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS nav_links_public_read ON public.navigation_links;
CREATE POLICY nav_links_public_read ON public.navigation_links FOR SELECT USING (published = true);

DROP POLICY IF EXISTS content_blocks_public_read ON public.content_blocks;
CREATE POLICY content_blocks_public_read ON public.content_blocks FOR SELECT USING (status='published' AND (published_at IS NULL OR published_at <= now()));

DROP POLICY IF EXISTS page_sections_public_read ON public.page_sections;
CREATE POLICY page_sections_public_read ON public.page_sections FOR SELECT USING (NOT is_draft AND visible AND (published_at IS NULL OR published_at <= now()));

DROP POLICY IF EXISTS media_assets_public_read ON public.media_assets;
CREATE POLICY media_assets_public_read ON public.media_assets FOR SELECT USING (bucket = 'public-media');

DROP POLICY IF EXISTS feature_toggles_public_read ON public.feature_toggles;
CREATE POLICY feature_toggles_public_read ON public.feature_toggles FOR SELECT USING (is_public AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR starts_at <= now()));

CREATE OR REPLACE VIEW public.published_navigation_links AS
  SELECT id, locale, menu, label, url, sort_order, is_external
  FROM public.navigation_links
  WHERE published = true
  ORDER BY menu, locale, sort_order, label;

CREATE OR REPLACE VIEW public.published_site_settings AS
  SELECT key, locale, value_json
  FROM public.site_settings
  WHERE is_public = true;

CREATE OR REPLACE VIEW public.published_content_blocks AS
  SELECT id, locale, type, slug, content_json, published_at
  FROM public.content_blocks
  WHERE status='published' AND (published_at IS NULL OR published_at <= now());

CREATE OR REPLACE VIEW public.published_page_sections AS
  SELECT ps.id, ps.page_path, ps.locale, ps.block_id, ps.sort_order
  FROM public.page_sections ps
  WHERE NOT ps.is_draft AND ps.visible AND (ps.published_at IS NULL OR ps.published_at <= now());

CREATE OR REPLACE VIEW public.published_media_assets AS
  SELECT id, bucket, storage_key, mime_type, width, height, size_bytes, alt, description, created_at
  FROM public.media_assets
  WHERE bucket = 'public-media';

CREATE OR REPLACE FUNCTION public.cms_enqueue_publish(p_target text, p_action text DEFAULT 'revalidate', p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog
AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.publish_jobs(target, action, payload, status)
  VALUES (p_target, COALESCE(p_action,'revalidate'), COALESCE(p_payload,'{}'::jsonb), 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

--------------------------------------------------------------------------------
-- 20251102_cms_revisions_triggers
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_insert_revision(p_target_table text, p_target_id uuid, p_target_key text, p_locale text, p_snapshot jsonb, p_message text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.content_revisions(target_table,target_id,target_key,locale,snapshot,author,message)
  VALUES (p_target_table,p_target_id,p_target_key,p_locale,p_snapshot,auth.uid(),p_message)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END$$;

CREATE OR REPLACE FUNCTION public.tf_rev_site_settings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.cms_insert_revision('site_settings',NULL,NEW.key,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    PERFORM public.cms_insert_revision('site_settings',NULL,NEW.key,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision('site_settings',NULL,OLD.key,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL);
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_rev_site_settings ON public.site_settings;
CREATE TRIGGER trg_rev_site_settings AFTER INSERT OR UPDATE OR DELETE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.tf_rev_site_settings();

CREATE OR REPLACE FUNCTION public.tf_rev_navigation_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.cms_insert_revision('navigation_links',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    PERFORM public.cms_insert_revision('navigation_links',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision('navigation_links',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL);
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_rev_navigation_links ON public.navigation_links;
CREATE TRIGGER trg_rev_navigation_links AFTER INSERT OR UPDATE OR DELETE ON public.navigation_links FOR EACH ROW EXECUTE FUNCTION public.tf_rev_navigation_links();

CREATE OR REPLACE FUNCTION public.tf_rev_content_blocks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.cms_insert_revision('content_blocks',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    PERFORM public.cms_insert_revision('content_blocks',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision('content_blocks',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL);
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_rev_content_blocks ON public.content_blocks;
CREATE TRIGGER trg_rev_content_blocks AFTER INSERT OR UPDATE OR DELETE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION public.tf_rev_content_blocks();

CREATE OR REPLACE FUNCTION public.tf_rev_page_sections() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.cms_insert_revision('page_sections',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    PERFORM public.cms_insert_revision('page_sections',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL);
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision('page_sections',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL);
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_rev_page_sections ON public.page_sections;
CREATE TRIGGER trg_rev_page_sections AFTER INSERT OR UPDATE OR DELETE ON public.page_sections FOR EACH ROW EXECUTE FUNCTION public.tf_rev_page_sections();

--------------------------------------------------------------------------------
-- 20251102_cms_publish_unpublish_rpcs
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_publish_block(p_block_id uuid, p_when timestamptz DEFAULT now()) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.content_blocks SET status='published', published_at = p_when WHERE id = p_block_id; PERFORM public.cms_enqueue_publish('tag:content'); END $$;
CREATE OR REPLACE FUNCTION public.cms_unpublish_block(p_block_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.content_blocks SET status='draft', published_at = NULL WHERE id = p_block_id; PERFORM public.cms_enqueue_publish('tag:content'); END $$;
CREATE OR REPLACE FUNCTION public.cms_publish_section(p_section_id uuid, p_when timestamptz DEFAULT now()) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.page_sections SET is_draft=false, published_at = p_when WHERE id = p_section_id; PERFORM public.cms_enqueue_publish('page:' || (SELECT page_path FROM public.page_sections WHERE id=p_section_id)); END $$;
CREATE OR REPLACE FUNCTION public.cms_unpublish_section(p_section_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.page_sections SET is_draft=true, published_at = NULL WHERE id = p_section_id; PERFORM public.cms_enqueue_publish('page:' || (SELECT page_path FROM public.page_sections WHERE id=p_section_id)); END $$;
CREATE OR REPLACE FUNCTION public.cms_publish_nav(p_menu text, p_locale text DEFAULT 'en', p_when timestamptz DEFAULT now()) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.navigation_links SET published=true, updated_at = p_when WHERE menu = p_menu AND locale = p_locale; PERFORM public.cms_enqueue_publish('tag:nav'); END $$;
CREATE OR REPLACE FUNCTION public.cms_unpublish_nav(p_menu text, p_locale text DEFAULT 'en') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$ BEGIN UPDATE public.navigation_links SET published=false WHERE menu = p_menu AND locale = p_locale; PERFORM public.cms_enqueue_publish('tag:nav'); END $$;

--------------------------------------------------------------------------------
-- 20251102_cms_translations_fix_unique_and_rls
--------------------------------------------------------------------------------
ALTER TABLE public.translations
  ADD COLUMN IF NOT EXISTS ns_norm text GENERATED ALWAYS AS (COALESCE(namespace,'')) STORED;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_translations_locale_key_ns') THEN
    EXECUTE 'DROP INDEX public.uq_translations_locale_key_ns';
  END IF;
END $$;
ALTER TABLE public.translations
  DROP CONSTRAINT IF EXISTS uq_translations_locale_key_ns,
  ADD CONSTRAINT uq_translations_locale_key_ns UNIQUE (locale, tkey, ns_norm);

CREATE OR REPLACE FUNCTION public.cms_upsert_translation(
  p_locale text, p_tkey text, p_value_json jsonb DEFAULT NULL, p_value_text text DEFAULT NULL, p_namespace text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.translations(locale,tkey,value_json,value_text,namespace,updated_by)
  VALUES (p_locale,p_tkey,p_value_json,p_value_text,p_namespace,auth.uid())
  ON CONFLICT (locale, tkey, ns_norm) DO UPDATE
  SET value_json=excluded.value_json, value_text=excluded.value_text, namespace=excluded.namespace, updated_at=now(), updated_by=auth.uid()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS translations_admin_editor_all ON public.translations;
CREATE POLICY translations_admin_editor_all ON public.translations FOR ALL USING (public.cms_is_editor()) WITH CHECK (public.cms_is_editor());
DROP POLICY IF EXISTS translations_public_read ON public.translations;
CREATE POLICY translations_public_read ON public.translations FOR SELECT USING (true);

--------------------------------------------------------------------------------
-- 20251102_fix_views_security_invoker
--------------------------------------------------------------------------------
ALTER VIEW public.published_navigation_links SET (security_invoker = true);
ALTER VIEW public.published_page_sections   SET (security_invoker = true);
ALTER VIEW public.published_content_blocks  SET (security_invoker = true);
ALTER VIEW public.published_media_assets    SET (security_invoker = true);
ALTER VIEW public.published_site_settings   SET (security_invoker = true);
ALTER VIEW public.published_translations    SET (security_invoker = true);

--------------------------------------------------------------------------------
-- Ad-hoc hardening for catalog MV (executed as raw SQL)
--------------------------------------------------------------------------------
REVOKE ALL ON public.catalog_mv FROM PUBLIC;
REVOKE ALL ON public.catalog_mv FROM anon;
REVOKE ALL ON public.catalog_mv FROM authenticated;

CREATE TABLE IF NOT EXISTS public.catalog_published AS
  SELECT * FROM public.catalog_mv WITH NO DATA;

ALTER TABLE public.catalog_published ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_published_public_read ON public.catalog_published;
CREATE POLICY catalog_published_public_read ON public.catalog_published FOR SELECT USING (true);
DROP POLICY IF EXISTS catalog_published_editor_all ON public.catalog_published;
CREATE POLICY catalog_published_editor_all ON public.catalog_published FOR ALL USING (public.cms_is_editor()) WITH CHECK (public.cms_is_editor());
GRANT SELECT ON public.catalog_published TO anon, authenticated;
REVOKE ALL ON public.catalog_published FROM PUBLIC;

DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position)
    INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='catalog_published';
  IF cols IS NOT NULL THEN
    EXECUTE format('CREATE OR REPLACE VIEW public.published_catalog AS SELECT %s FROM public.catalog_published;', cols);
    EXECUTE 'ALTER VIEW public.published_catalog SET (security_invoker = true)';
    EXECUTE 'GRANT SELECT ON public.published_catalog TO anon, authenticated';
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.sync_catalog_published(p_refresh_mv boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_catalog AS $$
BEGIN
  IF p_refresh_mv THEN
    BEGIN
      EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.catalog_mv';
    EXCEPTION WHEN others THEN
      EXECUTE 'REFRESH MATERIALIZED VIEW public.catalog_mv';
    END;
  END IF;
  TRUNCATE TABLE public.catalog_published;
  INSERT INTO public.catalog_published SELECT * FROM public.catalog_mv;
END$$;

-- Secure execute privileges for sync (grant as needed)
REVOKE EXECUTE ON FUNCTION public.sync_catalog_published(boolean) FROM PUBLIC;

--------------------------------------------------------------------------------
-- 20251102_catalog_published_indexes
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='catalog_published_pkey') THEN
    EXECUTE 'ALTER TABLE public.catalog_published ADD CONSTRAINT catalog_published_pkey PRIMARY KEY (id)';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_catalog_published_slug') THEN
    EXECUTE 'ALTER TABLE public.catalog_published ADD CONSTRAINT uq_catalog_published_slug UNIQUE (slug)';
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_catpub_category       ON public.catalog_published(category_slug);
CREATE INDEX IF NOT EXISTS idx_catpub_created_desc   ON public.catalog_published(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catpub_cat_created    ON public.catalog_published(category_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catpub_price          ON public.catalog_published(price);
CREATE INDEX IF NOT EXISTS idx_catpub_rating         ON public.catalog_published(rating);
CREATE INDEX IF NOT EXISTS idx_catpub_title_trgm     ON public.catalog_published USING gin (title gin_trgm_ops);

--------------------------------------------------------------------------------
-- 20251102_cms_grants_and_rpc_exec
--------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.site_settings,
  public.navigation_links,
  public.content_blocks,
  public.page_sections,
  public.media_assets,
  public.content_revisions,
  public.publish_jobs,
  public.form_templates,
  public.form_entries,
  public.feature_toggles,
  public.scheduled_content,
  public.translations
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cms_publish_block(uuid, timestamptz)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_unpublish_block(uuid)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_publish_section(uuid, timestamptz)FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_unpublish_section(uuid)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_publish_nav(text, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_unpublish_nav(text, text)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_upsert_translation(text, text, jsonb, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_enqueue_publish(text, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cms_publish_block(uuid, timestamptz)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_unpublish_block(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish_section(uuid, timestamptz)TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_unpublish_section(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish_nav(text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_unpublish_nav(text, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_upsert_translation(text, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_enqueue_publish(text, text, jsonb) TO authenticated;

--------------------------------------------------------------------------------
-- 20251102_cms_create_simple_rpcs
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_upsert_setting(
  p_key text,
  p_locale text,
  p_value jsonb,
  p_is_public boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.site_settings(key, locale, value_json, is_public, updated_by)
  VALUES (p_key, p_locale, COALESCE(p_value, '{}'::jsonb), COALESCE(p_is_public, true), auth.uid())
  ON CONFLICT (key, locale) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      is_public  = EXCLUDED.is_public,
      updated_at = now(),
      updated_by = auth.uid();
END$$;

CREATE OR REPLACE FUNCTION public.cms_create_block(
  p_locale text,
  p_type text,
  p_content jsonb,
  p_status text DEFAULT 'draft',
  p_slug text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.content_blocks(locale, type, status, content_json, slug, created_by, updated_by)
  VALUES (p_locale, p_type, COALESCE(p_status,'draft'), COALESCE(p_content,'{}'::jsonb), p_slug, auth.uid(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;

CREATE OR REPLACE FUNCTION public.cms_attach_section(
  p_page_path text,
  p_locale text,
  p_block_id uuid,
  p_sort_order int DEFAULT 0,
  p_is_draft boolean DEFAULT false,
  p_visible boolean DEFAULT true,
  p_published_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.page_sections(page_path, locale, block_id, sort_order, is_draft, visible, published_at, created_by, updated_by)
  VALUES (p_page_path, p_locale, p_block_id, COALESCE(p_sort_order,0), COALESCE(p_is_draft,false), COALESCE(p_visible,true), p_published_at, auth.uid(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;

GRANT EXECUTE ON FUNCTION public.cms_upsert_setting(text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_create_block(text, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_attach_section(text, text, uuid, int, boolean, boolean, timestamptz) TO authenticated;

-- EOF
