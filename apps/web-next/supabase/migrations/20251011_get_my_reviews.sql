drop function if exists public.get_my_reviews();

create or replace function public.get_my_reviews()
returns table (
  review_id text,
  product_id text,
  product_slug text,
  product_title text,
  product_image_path text,
  product_images jsonb,
  rating int,
  title text,
  body text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  return query
  select
    concat_ws(':', r.product_id::text, r.user_id::text) as review_id,
    r.product_id::text as product_id,
    coalesce(p.slug, r.product_id::text) as product_slug,
    p.title as product_title,
    nullif(p.image_path, '') as product_image_path,
    p.images::jsonb as product_images,
    r.rating,
    r.title,
    r.body,
    r.status,
    r.created_at,
    r.updated_at
  from public.product_reviews_raw r
  left join public.ecom_products p on p.id::text = r.product_id::text
  where r.user_id = v_uid
  order by coalesce(r.updated_at, r.created_at) desc nulls last, r.created_at desc
  limit 100;
end;
$$;

revoke all on function public.get_my_reviews() from public;
grant execute on function public.get_my_reviews() to authenticated;
grant execute on function public.get_my_reviews() to service_role;
