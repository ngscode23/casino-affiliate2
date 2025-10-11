-- Allow anonymous orders with items (do not require p_user_id)
begin;

create or replace function public.place_order_with_items(
  p_user_id uuid,
  p_items jsonb,
  p_currency text default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2);
begin
  -- Insert order; allow null user_id for guest checkout
  insert into public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  values (p_user_id, 'pending', 0, 0, 0, 0, coalesce(p_currency, 'EUR'))
  returning id into v_order_id;

  -- Insert items from payload (expects array of {id uuid, qty int}) joined with products for price/title
  insert into public.order_items (order_id, product_id, title, qty, unit_price)
  select
    v_order_id,
    p.id,
    coalesce(p.title, '') as title,
    greatest(1, i.qty)::int as qty,
    p.price::numeric(10,2) as unit_price
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as i(id uuid, qty int)
  join public.ecom_products p on p.id = i.id;

  select coalesce(sum(oi.total), 0)::numeric(10,2) into v_subtotal
  from public.order_items oi where oi.order_id = v_order_id;

  update public.orders
  set subtotal = v_subtotal,
      grand_total = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_order_with_items(uuid, jsonb, text) from public, anon;
grant execute on function public.place_order_with_items(uuid, jsonb, text) to authenticated, service_role;

commit;

