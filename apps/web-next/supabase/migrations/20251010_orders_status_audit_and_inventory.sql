-- Orders status audit log and basic inventory adjustments on status transitions
-- Safe to run multiple times; uses IF NOT EXISTS where applicable

begin;

-- 1) Audit table for order status changes
create table if not exists public.order_status_audit (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid null,
  reason text null,
  source text null
);

create index if not exists order_status_audit_order_id_idx on public.order_status_audit (order_id);
create index if not exists order_status_audit_changed_at_idx on public.order_status_audit (changed_at);

-- Helper to safely call optional validation function if it exists
create or replace function public._order_try_validate_transition(p_from text, p_to text)
returns void
language plpgsql
as $$
begin
  -- Call validation routine if present in DB
  begin
    perform public.order_validate_transition(p_from::text, p_to::text);
  exception when undefined_function then
    -- no-op if helper not installed in this project
    perform 1;
  end;
end;
$$;

-- Trigger: write audit row on status change and optionally validate transition
create or replace function public.trg_orders_status_audit()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    perform public._order_try_validate_transition(old.status, new.status);
    insert into public.order_status_audit(order_id, old_status, new_status, changed_by, reason, source)
    values (new.id, old.status, new.status, coalesce(auth.uid(), null), null, 'orders.update');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_audit_trg on public.orders;
create trigger orders_status_audit_trg
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.trg_orders_status_audit();

-- 2) Minimal inventory: stock levels and movements
create table if not exists public.stock_items (
  product_id uuid primary key,
  qty_available integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id bigserial primary key,
  order_id uuid null,
  order_item_id uuid null,
  product_id uuid not null,
  qty_delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id);
create index if not exists stock_movements_order_idx on public.stock_movements (order_id);

-- Apply inventory change for all items in order
create or replace function public._inventory_apply_delta(p_order_id uuid, p_reason text, p_sign int)
returns void
language sql
as $$
  -- Ensure rows exist in stock_items then update qty in one pass
  with items as (
    select oi.order_id, oi.product_id, coalesce(oi.qty, 1)::int as qty, oi.id as order_item_id
    from public.order_items oi
    where oi.order_id = p_order_id
  ), upsert as (
    insert into public.stock_items(product_id, qty_available)
    select distinct i.product_id, 0 from items i
    on conflict (product_id) do nothing
    returning product_id
  ), upd as (
    update public.stock_items s
    set qty_available = s.qty_available + (p_sign * i.qty), updated_at = now()
    from items i
    where s.product_id = i.product_id
    returning i.order_id, i.order_item_id, s.product_id, (p_sign * i.qty) as delta
  )
  insert into public.stock_movements(order_id, order_item_id, product_id, qty_delta, reason)
  select u.order_id, u.order_item_id, u.product_id, u.delta, p_reason from upd u;
$$;

-- Trigger: react on orders.status changes and adjust inventory on paid/refunded
create or replace function public.trg_orders_inventory()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    -- On payment success: decrement available stock
    if lower(new.status) = 'paid' and coalesce(lower(old.status), '') <> 'paid' then
      perform public._inventory_apply_delta(new.id, 'sold', -1);
    end if;
    -- On refund: return items to stock
    if lower(new.status) = 'refunded' and lower(coalesce(old.status, '')) in ('paid','fulfilled') then
      perform public._inventory_apply_delta(new.id, 'refund', +1);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_inventory_trg on public.orders;
create trigger orders_inventory_trg
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.trg_orders_inventory();

commit;

