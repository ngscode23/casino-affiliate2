-- Admin policies (guarded): apply only if target tables exist
-- Idempotent and safe to run multiple times

-- Ensure helper is present
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;

-- Wrap policy changes in guarded DO blocks to avoid errors if tables are absent

-- OFFERS
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'offers'
  ) then
    -- Drop legacy/allows-all policies if present
    begin
      drop policy if exists "Auth write offers" on public.offers;
      drop policy if exists "Admin write offers" on public.offers; -- ensure clean state
    exception when undefined_table then null; end;
    -- Create admin-only write policy
    create policy "Admin write offers"
      on public.offers for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- PARTNERS
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partners'
  ) then
    begin
      drop policy if exists "auth manage partners" on public.partners;
      drop policy if exists "Admin manage partners" on public.partners;
      drop policy if exists "admin manage partners" on public.partners;
    exception when undefined_table then null; end;
    create policy "admin manage partners"
      on public.partners for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- PARTNER_OFFERS
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'partner_offers'
  ) then
    begin
      drop policy if exists "auth manage partner_offers" on public.partner_offers;
      drop policy if exists "Admin manage partner_offers" on public.partner_offers;
      drop policy if exists "admin manage partner_offers" on public.partner_offers;
    exception when undefined_table then null; end;
    create policy "admin manage partner_offers"
      on public.partner_offers for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

