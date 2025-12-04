-- Make public.catalog_brands use security invoker semantics instead of the default security definer.
-- This ensures queries respect the permissions/RLS of the calling role.

begin;

alter view public.catalog_brands set (security_invoker = true);

commit;

