-- Minimal order placement RPC used by Netlify orders-create function
begin;

create or replace function public.place_order(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
begin
  insert into public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  values (p_user_id, 'pending', 0, 0, 0, 0, 'EUR')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.place_order(uuid) from public, anon;
grant execute on function public.place_order(uuid) to authenticated, service_role;

commit;

