-- Admin RLS tightening and helper function
-- - Adds public.is_admin() based on JWT claims
-- - Restricts writes on offers, partners, partner_offers to admins only

-- Helper function: checks role in app_metadata (preferred), then user_metadata, then top-level role
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;

-- OFFERS: admin-only writes
drop policy if exists "Auth write offers" on public.offers;
create policy "Admin write offers"
on public.offers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());



-- PARTNERS: admin-only writes
drop policy if exists "auth manage partners" on public.partners;
create policy "admin manage partners" on public.partners
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PARTNER_OFFERS: admin-only writes
drop policy if exists "auth manage partner_offers" on public.partner_offers;
create policy "admin manage partner_offers" on public.partner_offers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

