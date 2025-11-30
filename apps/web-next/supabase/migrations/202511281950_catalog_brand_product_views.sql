-- Ensure catalog brands/products views exist for the admin UI.

begin;

drop view if exists public.catalog_brands;
create view public.catalog_brands as
select
  id,
  slug,
  name,
  description,
  website,
  created_at
from catalog.brands;

drop view if exists public.catalog_products;
create view public.catalog_products as
select
  id,
  slug,
  title,
  description,
  price,
  currency,
  status,
  brand_id,
  created_at
from catalog.products;

grant select, insert, update, delete on public.catalog_brands to authenticated;
grant select, insert, update, delete on public.catalog_products to authenticated;
grant select, insert, update, delete on public.catalog_brands to service_role;
grant select, insert, update, delete on public.catalog_products to service_role;

commit;