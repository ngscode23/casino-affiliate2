-- CMS roles, helpers, content tables, RLS, and publish helpers.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles & helper functions
CREATE TABLE IF NOT EXISTS public.cms_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_roles_role ON public.cms_roles(role);

CREATE OR REPLACE FUNCTION public.cms_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
SELECT COALESCE(
  (auth.role() = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    WHERE lower(ae.email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
  OR EXISTS (
    SELECT 1 FROM public.cms_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  ),
  false
);
$$;

CREATE OR REPLACE FUNCTION public.cms_is_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
SELECT COALESCE(
  public.cms_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.cms_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'editor'
  ),
  false
);
$$;

-- Content tables
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
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
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
  UNIQUE (bucket, storage_key)
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
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
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'done', 'rejected'))
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

-- RLS policies
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

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'site_settings',
      'navigation_links',
      'content_blocks',
      'page_sections',
      'media_assets',
      'content_revisions',
      'publish_jobs',
      'form_templates',
      'form_entries',
      'feature_toggles',
      'scheduled_content',
      'cms_roles'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS cms_admin_editor_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY cms_admin_editor_all ON public.%I FOR ALL USING (public.cms_is_editor()) WITH CHECK (public.cms_is_editor())',
      t
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read
  ON public.site_settings
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS nav_links_public_read ON public.navigation_links;
CREATE POLICY nav_links_public_read
  ON public.navigation_links
  FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS content_blocks_public_read ON public.content_blocks;
CREATE POLICY content_blocks_public_read
  ON public.content_blocks
  FOR SELECT
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
  );

DROP POLICY IF EXISTS page_sections_public_read ON public.page_sections;
CREATE POLICY page_sections_public_read
  ON public.page_sections
  FOR SELECT
  USING (
    NOT is_draft
    AND visible
    AND (published_at IS NULL OR published_at <= now())
  );

DROP POLICY IF EXISTS media_assets_public_read ON public.media_assets;
CREATE POLICY media_assets_public_read
  ON public.media_assets
  FOR SELECT
  USING (bucket = 'public-media');

DROP POLICY IF EXISTS feature_toggles_public_read ON public.feature_toggles;
CREATE POLICY feature_toggles_public_read
  ON public.feature_toggles
  FOR SELECT
  USING (
    is_public
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- Front-end views
CREATE OR REPLACE VIEW public.published_navigation_links AS
SELECT
  id,
  locale,
  menu,
  label,
  url,
  sort_order,
  is_external
FROM public.navigation_links
WHERE published = true
ORDER BY menu, locale, sort_order, label;

CREATE OR REPLACE VIEW public.published_site_settings AS
SELECT key, locale, value_json
FROM public.site_settings
WHERE is_public = true;

CREATE OR REPLACE VIEW public.published_content_blocks AS
SELECT
  id,
  locale,
  type,
  slug,
  content_json,
  published_at
FROM public.content_blocks
WHERE status = 'published'
  AND (published_at IS NULL OR published_at <= now());

CREATE OR REPLACE VIEW public.published_page_sections AS
SELECT
  ps.id,
  ps.page_path,
  ps.locale,
  ps.block_id,
  ps.sort_order
FROM public.page_sections ps
WHERE NOT ps.is_draft
  AND ps.visible
  AND (ps.published_at IS NULL OR ps.published_at <= now());

CREATE OR REPLACE VIEW public.published_media_assets AS
SELECT
  id,
  bucket,
  storage_key,
  mime_type,
  width,
  height,
  size_bytes,
  alt,
  description,
  created_at
FROM public.media_assets
WHERE bucket = 'public-media';

-- Publish helper
CREATE OR REPLACE FUNCTION public.cms_enqueue_publish(
  p_target text,
  p_action text DEFAULT 'revalidate',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.publish_jobs(target, action, payload, status)
  VALUES (p_target, COALESCE(p_action, 'revalidate'), COALESCE(p_payload, '{}'::jsonb), 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMIT;
