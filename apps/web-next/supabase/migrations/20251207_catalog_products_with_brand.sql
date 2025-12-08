-- Expose catalog products with brand info in public schema for REST access
create or replace view public.catalog_products_with_brand as
select
  p.id,
  p.slug,
  p.title,
  p.brand_id,
  b.slug as brand_slug,
  b.name as brand_name
from catalog.products p
left join catalog.brands b on b.id = p.brand_id;

-- Permissions for clients
grant select on public.catalog_products_with_brand to anon, authenticated, service_role;
