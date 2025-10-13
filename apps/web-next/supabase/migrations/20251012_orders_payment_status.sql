begin;

alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'pending'::public.payment_status;

create index if not exists orders_payment_status_idx on public.orders(payment_status);

with latest_payment as (
  select distinct on (order_id) order_id, status
  from public.payments
  where order_id is not null
  order by order_id, created_at desc
)
update public.orders o
set payment_status = coalesce(
  latest_payment.status::public.payment_status,
  case
    when o.status in ('succeeded') then 'succeeded'::public.payment_status
    when o.status in ('failed', 'cancelled', 'canceled') then 'failed'::public.payment_status
    else 'pending'::public.payment_status
  end
)
from latest_payment
where latest_payment.order_id = o.id;

update public.orders
set payment_status = case
    when status in ('succeeded') then 'succeeded'::public.payment_status
    when status in ('failed', 'cancelled', 'canceled') then 'failed'::public.payment_status
    else payment_status
  end
where payment_status = 'pending'::public.payment_status;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'order_v2'
      and n.nspname = 'public'
  ) then
    execute $view$
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
        coalesce(
          o.payment_status::text,
          (
            select p.status::text
            from public.payments p
            where p.order_id = o.id
            order by p.created_at desc
            limit 1
          )
        ) as payment_status
      from public.orders o;
    $view$;
  end if;
end$$;

grant select on public.order_v2 to anon, authenticated;

commit;

