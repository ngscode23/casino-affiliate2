-- Basic CMS RPCs for admin/editor flows
-- Functions: cms_upsert_setting, cms_create_block, cms_attach_section
-- All functions enforce cms_is_editor() and record audit columns.

BEGIN;

SET search_path TO public, pg_catalog;

-- Upsert site setting
CREATE OR REPLACE FUNCTION public.cms_upsert_setting(
  p_key text,
  p_locale text,
  p_value jsonb,
  p_is_public boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF NOT public.cms_is_editor() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.site_settings AS s (key, locale, value_json, is_public, updated_at, updated_by)
  VALUES (
    trim(p_key),
    COALESCE(NULLIF(trim(p_locale), ''), 'en'),
    COALESCE(p_value, '{}'::jsonb),
    COALESCE(p_is_public, true),
    now(),
    auth.uid()
  )
  ON CONFLICT (key, locale)
  DO UPDATE SET
    value_json = EXCLUDED.value_json,
    is_public = EXCLUDED.is_public,
    updated_at = now(),
    updated_by = auth.uid();

  PERFORM public.cms_enqueue_publish(
    p_target => 'tag:content',
    p_action => 'revalidate',
    p_payload => jsonb_build_object('type','site_setting','key', trim(p_key), 'locale', COALESCE(NULLIF(trim(p_locale), ''), 'en'))
  );
END;
$$;

-- Create content block, returns id
CREATE OR REPLACE FUNCTION public.cms_create_block(
  p_locale text,
  p_type text,
  p_content jsonb,
  p_status text DEFAULT 'draft',
  p_slug text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_status text := COALESCE(NULLIF(lower(p_status),''), 'draft');
BEGIN
  IF NOT public.cms_is_editor() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status NOT IN ('draft','published','archived') THEN
    v_status := 'draft';
  END IF;

  INSERT INTO public.content_blocks (
    locale, type, slug, status, content_json, published_at,
    created_at, created_by, updated_at, updated_by
  )
  VALUES (
    COALESCE(NULLIF(trim(p_locale), ''), 'en'),
    trim(p_type),
    NULLIF(trim(p_slug), ''),
    v_status,
    COALESCE(p_content, '{}'::jsonb),
    CASE WHEN v_status = 'published' THEN now() ELSE NULL END,
    now(), auth.uid(), now(), auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Attach block to page as section, returns id
CREATE OR REPLACE FUNCTION public.cms_attach_section(
  p_page_path text,
  p_locale text,
  p_block_id uuid,
  p_sort_order int DEFAULT 0,
  p_is_draft boolean DEFAULT false,
  p_visible boolean DEFAULT true,
  p_published_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.cms_is_editor() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.page_sections (
    page_path, locale, block_id, sort_order, is_draft, visible, published_at,
    created_at, created_by, updated_at, updated_by
  )
  VALUES (
    CASE WHEN left(trim(p_page_path),1) = '/' THEN trim(p_page_path) ELSE '/' || trim(p_page_path) END,
    COALESCE(NULLIF(trim(p_locale), ''), 'en'),
    p_block_id,
    COALESCE(p_sort_order, 0),
    COALESCE(p_is_draft, false),
    COALESCE(p_visible, true),
    p_published_at,
    now(), auth.uid(), now(), auth.uid()
  )
  RETURNING id INTO v_id;

  -- revalidate the specific page cache tag as a convenience
  PERFORM public.cms_enqueue_publish('page:' || (
    CASE WHEN left(trim(p_page_path),1) = '/' THEN trim(p_page_path) ELSE '/' || trim(p_page_path) END
  ));

  RETURN v_id;
END;
$$;

COMMIT;
