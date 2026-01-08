begin;

create or replace function public.log_catalog_view_event(
  p_anon_id text,
  p_user_id uuid,
  p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = catalog, public
as $$
declare
  recent_exists boolean;
begin
  if p_anon_id is null or p_product_id is null then
    return;
  end if;

  select true
    into recent_exists
  from catalog.events
  where anon_id = p_anon_id
    and product_id = p_product_id
    and event_type = 'view_product'
    and created_at > (now() - interval '60 seconds')
  limit 1;

  if recent_exists then
    return;
  end if;

  insert into catalog.events (anon_id, user_id, event_type, product_id)
  values (p_anon_id, p_user_id, 'view_product', p_product_id);

  insert into catalog.product_stats (product_id, views_total, last_viewed_at)
  values (p_product_id, 1, now())
  on conflict (product_id) do update
    set views_total = catalog.product_stats.views_total + 1,
        last_viewed_at = now();
end;
$$;

commit;
