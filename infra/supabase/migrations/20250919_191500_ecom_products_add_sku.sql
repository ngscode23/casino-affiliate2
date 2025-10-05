alter table public.ecom_products add column if not exists sku text;

update public.ecom_products
set sku = slug
where (sku is null or sku = '');

with computed as (
  select
    id,
    trim(both '-' from regexp_replace(lower(coalesce(title, slug, sku, 'product')), '[^a-z0-9]+', '-', 'g')) as base_slug
  from public.ecom_products
),
normalized as (
  select
    id,
    case when base_slug = '' then 'product-' || substr(id::text, 1, 8) else base_slug end as slug
  from computed
),
dedup as (
  select
    id,
    slug,
    row_number() over (partition by slug order by id) as rn
  from normalized
)
update public.ecom_products p
set slug = case when d.rn = 1 then d.slug else d.slug || '-' || d.rn end
from dedup d
where p.id = d.id;

create unique index if not exists ecom_products_sku_key on public.ecom_products(sku);
create unique index if not exists ecom_products_slug_key on public.ecom_products(slug);
