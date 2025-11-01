begin;

-- Recreate order_v2 view with explicit definition
drop view if exists public.order_v2;
create view public.order_v2 as
select
  id,
  user_id,
  created_at,
  coalesce(subtotal, 0::numeric)::numeric(10,2) as amount_subtotal,
  coalesce(discount_total, 0::numeric)::numeric(10,2) as amount_discounts,
  coalesce(shipping_total, 0::numeric)::numeric(10,2) as amount_tax,
  coalesce(
    grand_total,
    (select sum(oi.total) from public.order_items oi where oi.order_id = o.id),
    subtotal - discount_total + shipping_total,
    0::numeric
  )::numeric(10,2) as amount_total,
  currency,
  status,
  coalesce(
    payment_status,
    (select p.status from public.payments p where p.order_id = o.id order by p.created_at desc limit 1)
  ) as payment_status
from public.orders o;

-- Drop legacy reviews view if present
drop view if exists public.product_reviews;

commit;

