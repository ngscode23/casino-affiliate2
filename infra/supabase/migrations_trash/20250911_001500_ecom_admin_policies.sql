-- Admin write policies for e-commerce tables (guarded)
-- Allows authenticated users with role=admin to insert/update/delete on ecom tables

-- Ensure helper exists
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;

-- ecom_categories
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ecom_categories') then
    begin
      drop policy if exists "ecom_categories_admin_write" on public.ecom_categories;
    exception when undefined_table then null; end;
    create policy "ecom_categories_admin_write"
      on public.ecom_categories for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- ecom_products
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='ecom_products') then
    begin
      drop policy if exists "ecom_products_admin_write" on public.ecom_products;
    exception when undefined_table then null; end;
    create policy "ecom_products_admin_write"
      on public.ecom_products for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

