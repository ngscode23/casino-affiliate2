-- Ensure table-level privileges align with RLS policies
-- Safe to run multiple times (GRANT is idempotent)

-- 0) Schema usage for web roles
grant usage on schema public to anon, authenticated, service_role;

-- 1) offers
-- Rationale: RLS policies allow anon/auth to read and service_role to write
grant select on table public.offers to anon, authenticated, service_role;
grant insert, update, delete on table public.offers to service_role;

-- 2) clicks
-- Rationale: authenticated may read; service_role writes
grant select on table public.clicks to authenticated, service_role;
grant insert on table public.clicks to service_role;

-- 3) impressions
grant select on table public.impressions to authenticated, service_role;
grant insert on table public.impressions to service_role;

-- 4) favorites (only via authenticated users)
grant select, insert, update, delete on table public.favorites to authenticated;

-- 5) partners and partner_offers (read-only via policies)
grant select on table public.partners to anon, authenticated, service_role;
grant select on table public.partner_offers to anon, authenticated, service_role;

-- Note: With RLS enabled, these GRANTs do not expose rows beyond policies.

