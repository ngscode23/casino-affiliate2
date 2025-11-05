-- CMS revisions, publish helpers, and translations support.
BEGIN;

-- Revision snapshots ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_insert_revision(
  p_target_table text,
  p_target_id uuid,
  p_target_key text,
  p_locale text,
  p_snapshot jsonb,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.content_revisions (
    target_table,
    target_id,
    target_key,
    locale,
    snapshot,
    author,
    message
  )
  VALUES (
    p_target_table,
    p_target_id,
    p_target_key,
    p_locale,
    p_snapshot,
    auth.uid(),
    p_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tf_rev_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.cms_insert_revision(
      'site_settings',
      NULL,
      NEW.key,
      NEW.locale,
      jsonb_build_object('op', 'INSERT', 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.cms_insert_revision(
      'site_settings',
      NULL,
      NEW.key,
      NEW.locale,
      jsonb_build_object('op', 'UPDATE', 'old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision(
      'site_settings',
      NULL,
      OLD.key,
      OLD.locale,
      jsonb_build_object('op', 'DELETE', 'old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_rev_site_settings ON public.site_settings;
CREATE TRIGGER trg_rev_site_settings
AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.tf_rev_site_settings();

CREATE OR REPLACE FUNCTION public.tf_rev_navigation_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.cms_insert_revision(
      'navigation_links',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'INSERT', 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.cms_insert_revision(
      'navigation_links',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'UPDATE', 'old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision(
      'navigation_links',
      OLD.id,
      NULL,
      OLD.locale,
      jsonb_build_object('op', 'DELETE', 'old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_rev_navigation_links ON public.navigation_links;
CREATE TRIGGER trg_rev_navigation_links
AFTER INSERT OR UPDATE OR DELETE ON public.navigation_links
FOR EACH ROW
EXECUTE FUNCTION public.tf_rev_navigation_links();

CREATE OR REPLACE FUNCTION public.tf_rev_content_blocks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.cms_insert_revision(
      'content_blocks',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'INSERT', 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.cms_insert_revision(
      'content_blocks',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'UPDATE', 'old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision(
      'content_blocks',
      OLD.id,
      NULL,
      OLD.locale,
      jsonb_build_object('op', 'DELETE', 'old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_rev_content_blocks ON public.content_blocks;
CREATE TRIGGER trg_rev_content_blocks
AFTER INSERT OR UPDATE OR DELETE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.tf_rev_content_blocks();

CREATE OR REPLACE FUNCTION public.tf_rev_page_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.cms_insert_revision(
      'page_sections',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'INSERT', 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.cms_insert_revision(
      'page_sections',
      NEW.id,
      NULL,
      NEW.locale,
      jsonb_build_object('op', 'UPDATE', 'old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    PERFORM public.cms_insert_revision(
      'page_sections',
      OLD.id,
      NULL,
      OLD.locale,
      jsonb_build_object('op', 'DELETE', 'old', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_rev_page_sections ON public.page_sections;
CREATE TRIGGER trg_rev_page_sections
AFTER INSERT OR UPDATE OR DELETE ON public.page_sections
FOR EACH ROW
EXECUTE FUNCTION public.tf_rev_page_sections();

-- Publish helpers ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_publish_block(
  p_block_id uuid,
  p_when timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  UPDATE public.content_blocks
  SET status = 'published',
      published_at = p_when
  WHERE id = p_block_id;

  PERFORM public.cms_enqueue_publish('tag:content');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_unpublish_block(p_block_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  UPDATE public.content_blocks
  SET status = 'draft',
      published_at = NULL
  WHERE id = p_block_id;

  PERFORM public.cms_enqueue_publish('tag:content');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_publish_section(
  p_section_id uuid,
  p_when timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_page text;
BEGIN
  UPDATE public.page_sections
  SET is_draft = false,
      published_at = p_when
  WHERE id = p_section_id;

  SELECT page_path INTO v_page
  FROM public.page_sections
  WHERE id = p_section_id;

  IF v_page IS NOT NULL THEN
    PERFORM public.cms_enqueue_publish('page:' || v_page);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_unpublish_section(p_section_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_page text;
BEGIN
  UPDATE public.page_sections
  SET is_draft = true,
      published_at = NULL
  WHERE id = p_section_id;

  SELECT page_path INTO v_page
  FROM public.page_sections
  WHERE id = p_section_id;

  IF v_page IS NOT NULL THEN
    PERFORM public.cms_enqueue_publish('page:' || v_page);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_publish_nav(
  p_menu text,
  p_locale text DEFAULT 'en',
  p_when timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  UPDATE public.navigation_links
  SET published = true,
      updated_at = p_when
  WHERE menu = p_menu
    AND locale = p_locale;

  PERFORM public.cms_enqueue_publish('tag:nav');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_unpublish_nav(
  p_menu text,
  p_locale text DEFAULT 'en'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  UPDATE public.navigation_links
  SET published = false
  WHERE menu = p_menu
    AND locale = p_locale;

  PERFORM public.cms_enqueue_publish('tag:nav');
END;
$$;

-- Translations ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  tkey text NOT NULL,
  value_text text NULL,
  value_json jsonb NULL,
  namespace text NULL,
  ns_norm text GENERATED ALWAYS AS (COALESCE(namespace, '')) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id),
  UNIQUE (locale, tkey, ns_norm)
);

CREATE INDEX IF NOT EXISTS idx_translations_locale_ns
  ON public.translations(locale, ns_norm);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS translations_admin_editor_all ON public.translations;
CREATE POLICY translations_admin_editor_all
  ON public.translations
  FOR ALL
  USING (public.cms_is_editor())
  WITH CHECK (public.cms_is_editor());

DROP POLICY IF EXISTS translations_public_read ON public.translations;
CREATE POLICY translations_public_read
  ON public.translations
  FOR SELECT
  USING (true);

CREATE OR REPLACE VIEW public.published_translations AS
SELECT
  locale,
  tkey,
  COALESCE(value_text, value_json::text) AS value,
  namespace
FROM public.translations;

CREATE OR REPLACE FUNCTION public.cms_upsert_translation(
  p_locale text,
  p_tkey text,
  p_value_json jsonb DEFAULT NULL,
  p_value_text text DEFAULT NULL,
  p_namespace text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.translations (locale, tkey, value_json, value_text, namespace, updated_by)
  VALUES (p_locale, p_tkey, p_value_json, p_value_text, p_namespace, auth.uid())
  ON CONFLICT (locale, tkey, ns_norm)
  DO UPDATE
  SET value_json = excluded.value_json,
      value_text = excluded.value_text,
      namespace = excluded.namespace,
      updated_at = now(),
      updated_by = auth.uid()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMIT;
