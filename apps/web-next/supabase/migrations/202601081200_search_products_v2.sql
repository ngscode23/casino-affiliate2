begin;

create or replace view public.products_unified as
select
  p.currency,
  p.id,
  p.price as price_amount,
  p.price_cents,
  p.slug,
  'ecom'::text as source,
  p.status,
  p.title
from public.ecom_products p
where p.deleted_at is null
  and coalesce(p.to_delete, false) = false
union all
select
  p.currency,
  p.id,
  p.price as price_amount,
  p.price_cents,
  p.slug,
  'products'::text as source,
  p.status,
  p.title
from public.products p;

create or replace view public.products_unified_dedup as
select
  p.category_slug,
  p.currency,
  p.id,
  p.price as price_amount,
  p.price_cents,
  p.rating,
  p.sku,
  p.slug,
  'ecom'::text as source,
  p.status,
  coalesce(p.tags, array[]::text[]) as tags_text,
  p.title
from public.ecom_products p
where p.deleted_at is null
  and coalesce(p.to_delete, false) = false
union all
select
  p.category_slug,
  p.currency,
  p.id,
  p.price as price_amount,
  p.price_cents,
  p.rating,
  p.sku,
  p.slug,
  'products'::text as source,
  p.status,
  coalesce(p.tags, array[]::text[]) as tags_text,
  p.title
from public.products p;

alter view public.products_unified set (security_invoker = true);
alter view public.products_unified_dedup set (security_invoker = true);

grant select on public.products_unified to anon, authenticated, service_role;
grant select on public.products_unified_dedup to anon, authenticated, service_role;

create or replace function public.search_products_v2(
  q text default null,
  sort_by text default 'relevance',
  sort_dir text default 'desc',
  min_price numeric default null,
  max_price numeric default null,
  statuses text[] default array['active'],
  limit_count integer default 20,
  offset_count integer default 0,
  category_slugs text[] default null,
  skus text[] default null,
  sources text[] default null,
  min_rating real default null
)
returns setof public.products_unified
language sql
stable
set search_path = 'pg_catalog', 'public'
as $$/*  */
  with params as (
    select
      case
        when sort_by is null or lower(sort_by) not in ('relevance', 'price', 'title') then 'relevance'
        else lower(sort_by)
      end as sort_by_norm,
      case
        when sort_dir is null or lower(sort_dir) not in ('asc', 'desc') then 'desc'
        else lower(sort_dir)
      end as sort_dir_norm,
      greatest(coalesce(limit_count, 20), 0) as limit_count_norm,
      greatest(coalesce(offset_count, 0), 0) as offset_count_norm
  ),
  filtered as (
    select
      pu.*,
      case
        when q is null or q = '' then 0
        else
          (case when pu.title ilike '%' || q || '%' then 4 else 0 end) +
          (case when pu.slug ilike '%' || q || '%' then 3 else 0 end) +
          (case when pu.sku ilike '%' || q || '%' then 2 else 0 end) +
          (case when pu.category_slug ilike '%' || q || '%' then 1 else 0 end) +
          (case when exists (
            select 1
            from unnest(coalesce(pu.tags_text, array[]::text[])) t
            where t ilike '%' || q || '%'
          ) then 1 else 0 end)
      end as relevance_score
    from public.products_unified_dedup pu
    where (statuses is null or pu.status = any(statuses))
      and (min_price is null or pu.price_amount >= min_price)
      and (max_price is null or pu.price_amount <= max_price)
      and (q is null or q = '' or (
        pu.title ilike '%' || q || '%'
        or pu.slug ilike '%' || q || '%'
        or pu.sku ilike '%' || q || '%'
        or pu.category_slug ilike '%' || q || '%'
        or exists (
          select 1
          from unnest(coalesce(pu.tags_text, array[]::text[])) t
          where t ilike '%' || q || '%'
        )
      ))
      and (category_slugs is null or pu.category_slug = any(category_slugs))
      and (skus is null or pu.sku = any(skus))
      and (sources is null or pu.source = any(sources))
      and (min_rating is null or pu.rating >= min_rating)
  )
  select
    f.currency,
    f.id,
    f.price_amount,
    f.price_cents,
    f.slug,
    f.source,
    f.status,
    f.title
  from filtered f
  cross join params p
  order by
    case when p.sort_by_norm = 'price' and p.sort_dir_norm = 'asc' then f.price_amount end asc nulls last,
    case when p.sort_by_norm = 'price' and p.sort_dir_norm = 'desc' then f.price_amount end desc nulls last,
    case when p.sort_by_norm = 'title' and p.sort_dir_norm = 'asc' then f.title end asc nulls last,
    case when p.sort_by_norm = 'title' and p.sort_dir_norm = 'desc' then f.title end desc nulls last,
    case when p.sort_by_norm = 'relevance' and p.sort_dir_norm = 'asc' then f.relevance_score end asc nulls last,
    case when p.sort_by_norm = 'relevance' and p.sort_dir_norm = 'desc' then f.relevance_score end desc nulls last,
    f.id
  limit (select limit_count_norm from params)
  offset (select offset_count_norm from params);
$$;

commit;
