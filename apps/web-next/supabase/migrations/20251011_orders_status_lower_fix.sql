-- Fix functions using lower() on enum columns by casting to text

begin;

-- Update inventory trigger to cast enum status to text before lower()
create or replace function public.trg_orders_inventory()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    if lower(new.status::text) = 'paid' and coalesce(lower(old.status::text), '') <> 'paid' then
      perform public._inventory_apply_delta(new.id, 'sold', -1);
    end if;
    if lower(new.status::text) = 'refunded' and lower(coalesce(old.status::text, '')) in ('paid','fulfilled') then
      perform public._inventory_apply_delta(new.id, 'refund', +1);
    end if;
  end if;
  return new;
end;
$$;

-- Update refund RPC to cast enum status to text before comparisons
create or replace function public.refund_order_apply(
  p_order_id uuid,
  p_refund_id text,
  p_amount_cents integer,
  p_currency text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_old_status text;
  v_updated int;
begin
  insert into public.payment_refunds(order_id, payment_intent_id, refund_id, amount_cents, currency, reason)
  select o.id, coalesce(nullif(trim(o.payment_intent_id), ''), 'unknown'), p_refund_id, p_amount_cents, p_currency, p_reason
  from public.orders o
  where o.id = p_order_id
  on conflict (refund_id) do nothing;

  select status::text into v_old_status from public.orders where id = p_order_id;

  update public.orders
  set status = 'refunded', refunded_at = now()
  where id = p_order_id and lower(coalesce(status::text, '')) in ('paid','fulfilled')
  returning 1 into v_updated;

  if coalesce(v_updated, 0) = 0 then
    if exists(select 1 from public.orders where id = p_order_id and lower(coalesce(status::text, '')) = 'refunded') then
      return true;
    end if;
  end if;

  return true;
end;
$$;

commit;
