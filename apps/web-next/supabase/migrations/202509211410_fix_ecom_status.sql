-- Ensure ecom_products uses active status by default and allows it in CHECK
begin;

alter table if exists public.ecom_products
  alter column status set default 'active';

-- Drop legacy constraint if it exists
alter table if exists public.ecom_products
  drop constraint if exists ecom_products_status_check;

alter table if exists public.ecom_products
  drop constraint if exists chk_ecom_products_status_allowed;

alter table if exists public.ecom_products
  add constraint chk_ecom_products_status_allowed
  check (status = any('{active,archived,draft}'::text[]));

-- Normalize existing rows
update public.ecom_products
set status = 'active'
where status not in ('active','archived');

commit;
