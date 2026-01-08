-- Canonical public view for the new catalog + seed category links for existing models.

begin;

-- Public-facing catalog view (brand + primary category).
drop view if exists public.catalog_products_v;
create view public.catalog_products_v as
select
  p.id,
  p.slug,
  p.title,
  p.description,
  p.price,
  p.currency,
  p.status,
  p.thumbnail_url,
  p.specs,
  p.created_at,
  p.updated_at,
  p.brand_id,
  b.slug as brand_slug,
  b.name as brand_name,
  c.id as category_id,
  c.slug as category_slug,
  c.title as category_title,
  pc.is_primary as category_is_primary
from catalog.products p
left join catalog.brands b on b.id = p.brand_id
left join lateral (
  select pc.category_id, pc.is_primary
  from catalog.product_categories pc
  where pc.product_id = p.id
  order by pc.is_primary desc nulls last
  limit 1
) pc on true
left join catalog.categories c on c.id = pc.category_id;

-- Ensure the view respects the querying user's permissions/RLS (Supabase linter requirement).
alter view public.catalog_products_v set (security_invoker = true);

grant select on public.catalog_products_v to anon, authenticated, service_role;

-- Seed product->category links for existing models (phones/laptops).
with cat as (
  select id, slug
  from catalog.categories
  where slug in ('phones', 'laptops')
),
mapping as (
  select
    p.id as product_id,
    case
      when p.slug ~* '(iphone|pixel|samsung|galaxy|xiaomi|phone)' then 'phones'
      when p.slug ~* '(macbook|ideapad|laptop|tulpar)' then 'laptops'
      else null
    end as category_slug
  from catalog.products p
)
insert into catalog.product_categories (product_id, category_id, is_primary)
select m.product_id, c.id, true
from mapping m
join cat c on c.slug = m.category_slug
left join catalog.product_categories pc
  on pc.product_id = m.product_id
 and pc.category_id = c.id
where m.category_slug is not null
  and pc.product_id is null;

-- Keep only categories with models active (optional but aligns with real catalog).
update catalog.categories c
set is_active = exists (
  select 1 from catalog.product_categories pc where pc.category_id = c.id
)
where c.is_active is distinct from exists (
  select 1 from catalog.product_categories pc where pc.category_id = c.id
);

commit;
