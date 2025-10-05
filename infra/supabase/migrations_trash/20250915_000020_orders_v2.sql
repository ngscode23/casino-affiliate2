-- orders_v2: status history, validators, helpers, and order_v2 view
-- Non-breaking: does not alter existing columns or types
begin;

-- 1) Helper enum-like validation via functions (keep existing text columns)
create or replace function public.order_allowed_status(p_status text)
returns boolean
language sql immutable
as $$
  select p_status in (
    'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
  );
$$;

create or replace function public.order_allowed_transition(p_from text, p_to text)
returns boolean
language sql immutable
as $$
  -- Allowed transitions (non-exhaustive, keep simple for demo):
  -- pending -> processing | cancelled | failed
  -- processing -> succeeded | failed
  -- succeeded -> refunded
  -- cancelled -> (no further transitions)
  -- failed -> (no further transitions)
  select case
    when p_from is null then order_allowed_status(p_to)
    when p_from = p_to then true
    when p_from = 'pending' and p_to in ('processing', 'cancelled', 'failed') then true
    when p_from = 'processing' and p_to in ('succeeded', 'failed') then true
    when p_from = 'succeeded' and p_to in ('refunded') then true
    else false
  end;
$$;

create or replace function public.order_validate_transition(p_from text, p_to text)
returns void
language plpgsql
as $$
begin
  if not order_allowed_status(p_to) then
    raise exception 'invalid_order_status: %', p_to using errcode = 'P0001';
  end if;
  if p_from is distinct from p_to and not order_allowed_transition(p_from, p_to) then
    raise exception 'illegal_order_transition: % -> %', p_from, p_to using errcode = 'P0001';
  end if;
end;
$$;

-- 2) Status history table
create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid null,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history(order_id, created_at desc);

-- 3) Triggers: validate transitions + log history
create or replace function public.trg_orders_validate_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.order_validate_transition(old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_validate_status on public.orders;
create trigger orders_validate_status
  before update of status on public.orders
  for each row
  execute function public.trg_orders_validate_status();

create or replace function public.trg_orders_log_status()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid := null;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, from_status, to_status, changed_by, reason)
    values (new.id, null, new.status, v_actor, 'create');
    return new;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history(order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, v_actor);
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
  after insert or update of status on public.orders
  for each row
  execute function public.trg_orders_log_status();

-- 4) Payments -> Orders status sync (mock-friendly)
-- When payment is authorized/captured/succeeded: pending -> processing, processing -> succeeded on 'succeeded'
-- When payment failed: pending|processing -> failed
create or replace function public.trg_payments_sync_order()
returns trigger
language plpgsql
as $$
declare
  v_from text;
  v_to   text;
begin
  -- only react if order_id present
  if new.order_id is null then
    return new;
  end if;

  select status into v_from from public.orders where id = new.order_id for update;
  if not found then
    return new;
  end if;

  if new.status in ('authorized', 'captured') then
    -- move pending -> processing
    if v_from = 'pending' then
      update public.orders set status = 'processing' where id = new.order_id;
    end if;
  elsif new.status in ('succeeded') then
    -- mark order as succeeded
    if v_from in ('pending', 'processing') then
      update public.orders set status = 'succeeded', paid_at = coalesce(paid_at, now()) where id = new.order_id;
    end if;
  elsif new.status in ('failed', 'canceled') then
    if v_from in ('pending', 'processing') then
      update public.orders set status = 'failed' where id = new.order_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_sync_order on public.payments;
create trigger payments_sync_order
  after insert or update of status on public.payments
  for each row
  execute function public.trg_payments_sync_order();

-- 5) Safe indexes (wrapped to avoid errors if table missing)
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname='orders' and n.nspname='public') then
    create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
    create index if not exists orders_status_idx on public.orders(status);
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname='payments' and n.nspname='public') then
    create index if not exists payments_order_idx on public.payments(order_id);
  end if;
end$$;

-- 6) order_v2 view: normalized amounts + payment_status
do $$
declare
  v_has_payments boolean;
begin
  select exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'payments' and n.nspname = 'public'
  ) into v_has_payments;

  if v_has_payments then
    execute $$
      create or replace view public.order_v2 as
      select
        o.id,
        o.user_id,
        o.created_at,
        coalesce(o.subtotal, 0)::numeric(10,2) as amount_subtotal,
        coalesce(o.discount_total, 0)::numeric(10,2) as amount_discounts,
        coalesce(o.shipping_total, 0)::numeric(10,2) as amount_tax,
        coalesce(
          o.grand_total,
          (select sum(oi.total) from public.order_items oi where oi.order_id = o.id),
          (o.subtotal - o.discount_total + o.shipping_total),
          0
        )::numeric(10,2) as amount_total,
        o.currency,
        o.status,
        (
          select p.status
          from public.payments p
          where p.order_id = o.id
          order by p.created_at desc
          limit 1
        ) as payment_status
      from public.orders o;
    $$;
  else
    execute $$
      create or replace view public.order_v2 as
      select
        o.id,
        o.user_id,
        o.created_at,
        coalesce(o.subtotal, 0)::numeric(10,2) as amount_subtotal,
        coalesce(o.discount_total, 0)::numeric(10,2) as amount_discounts,
        coalesce(o.shipping_total, 0)::numeric(10,2) as amount_tax,
        coalesce(
          o.grand_total,
          (select sum(oi.total) from public.order_items oi where oi.order_id = o.id),
          (o.subtotal - o.discount_total + o.shipping_total),
          0
        )::numeric(10,2) as amount_total,
        o.currency,
        o.status,
        null::text as payment_status
      from public.orders o;
    $$;
  end if;
end$$;

grant select on public.order_v2 to anon, authenticated;

commit;

