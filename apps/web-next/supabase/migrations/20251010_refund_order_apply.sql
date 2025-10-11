-- Refund workflow: persistence for refunds and RPC to apply refund results
-- Stripe refund creation should be done server-side; this RPC finalizes DB state.

begin;

-- Extend orders with refunded_at timestamp (nullable)
alter table if exists public.orders
  add column if not exists refunded_at timestamptz;

-- Table to track payment refunds
create table if not exists public.payment_refunds (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_intent_id text not null,
  refund_id text not null,
  amount_cents integer not null,
  currency text not null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists payment_refunds_order_idx on public.payment_refunds (order_id);
create index if not exists payment_refunds_refund_idx on public.payment_refunds (refund_id);

-- RPC: apply refund result (order_id, refund metadata) and transition status → refunded when appropriate
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
  -- Persist refund record (idempotent on refund_id)
  insert into public.payment_refunds(order_id, payment_intent_id, refund_id, amount_cents, currency, reason)
  select o.id, coalesce(nullif(trim(o.payment_intent_id), ''), 'unknown'), p_refund_id, p_amount_cents, p_currency, p_reason
  from public.orders o
  where o.id = p_order_id
  on conflict (refund_id) do nothing;

  -- Read current status for transition logic
  select status into v_old_status from public.orders where id = p_order_id;

  -- Prefer safe transition from paid/fulfilled → refunded
  update public.orders
  set status = 'refunded', refunded_at = now()
  where id = p_order_id and lower(coalesce(status,'')) in ('paid','fulfilled')
  returning 1 into v_updated;

  if coalesce(v_updated, 0) = 0 then
    -- If already refunded, treat as success; otherwise leave status as-is
    if exists(select 1 from public.orders where id = p_order_id and lower(coalesce(status,'')) = 'refunded') then
      return true;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.refund_order_apply(uuid, text, integer, text, text) from public, anon;
grant execute on function public.refund_order_apply(uuid, text, integer, text, text) to authenticated, service_role;

commit;

