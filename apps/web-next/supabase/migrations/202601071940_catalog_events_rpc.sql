begin;

create or replace view public.catalog_events_v as
select
  id,
  anon_id,
  user_id,
  event_type,
  product_id,
  created_at
from catalog.events;

alter view public.catalog_events_v set (security_invoker = true);

grant select on public.catalog_events_v to anon, authenticated, service_role;

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
begin
  insert into catalog.events (anon_id, user_id, event_type, product_id)
  values (p_anon_id, p_user_id, 'view_product', p_product_id);
end;
$$;

revoke all on function public.log_catalog_view_event(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.log_catalog_view_event(text, uuid, uuid) to service_role;

commit;
