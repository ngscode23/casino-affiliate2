-- Improve order_history_v amount and status handling
begin;

create or replace view public.order_history_v as
select
  o.id         as order_id,
  o.created_at as created_at,
  coalesce(
    o.grand_total,
    (select sum(oi.total) from public.order_items oi where oi.order_id = o.id),
    (o.subtotal - o.discount_total + o.shipping_total),
    0
  )::numeric(10,2) as amount,
  o.currency   as currency,
  coalesce(
    (
      select (p.status)::text
      from public.payments p
      where p.order_id = o.id
      order by case p.status when 'succeeded' then 3 when 'pending' then 2 else 1 end desc, p.created_at desc
      limit 1
    ),
    (o.status)::text
  ) as status
from public.orders o;

grant select on public.order_history_v to anon, authenticated;

commit;

