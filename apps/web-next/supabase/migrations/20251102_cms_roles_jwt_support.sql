-- Allow cms_is_admin/editor to honor Supabase auth JWT roles metadata.

BEGIN;

SET search_path TO public, pg_catalog;

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
      WHERE lower(ae.email) = lower(COALESCE(auth.jwt()->>'email', ''))
    )
    OR EXISTS (
      SELECT 1
      FROM public.cms_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'admin'
    )
    OR lower(COALESCE(auth.jwt()->>'role', '')) = 'admin'
    OR lower(COALESCE(auth.jwt()->'app_metadata'->>'role', '')) = 'admin'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
      ) AS role(role_name)
      WHERE lower(role_name) = 'admin'
    )
  , false);
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
    OR lower(COALESCE(auth.jwt()->>'role', '')) IN ('admin', 'editor')
    OR lower(COALESCE(auth.jwt()->'app_metadata'->>'role', '')) IN ('admin', 'editor')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
      ) AS role(role_name)
      WHERE lower(role_name) IN ('admin', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.cms_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('admin', 'editor')
    )
  , false);
$$;

COMMIT;

