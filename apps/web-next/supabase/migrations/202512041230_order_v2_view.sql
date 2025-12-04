DROP VIEW IF EXISTS public.order_v2;

CREATE VIEW public.order_v2 AS
SELECT
  o.id,
  o.user_id,
  o.created_at,
  COALESCE(o.subtotal, 0)::numeric(10, 2)         AS amount_subtotal,
  COALESCE(o.discount_total, 0)::numeric(10, 2)   AS amount_discounts,
  COALESCE(o.shipping_total, 0)::numeric(10, 2)   AS shipping_total,
  GREATEST(
    (
      COALESCE(o.grand_total, 0)
      - COALESCE(o.subtotal, 0)
      + COALESCE(o.discount_total, 0)
      - COALESCE(o.shipping_total, 0)
    )::numeric(10, 2),
    0::numeric
  )                                               AS amount_tax,
  COALESCE(
    o.grand_total,
    (COALESCE(o.subtotal, 0) - COALESCE(o.discount_total, 0) + COALESCE(o.shipping_total, 0))
  )::numeric(10, 2)                               AS amount_total,
  o.currency,
  o.status,
  COALESCE(
    o.payment_status,
    (
      SELECT p.status
      FROM payments p
      WHERE p.order_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 1
    )
  ) AS payment_status
FROM orders o;

COMMENT ON VIEW public.order_v2 IS
  'Order totals view with normalized subtotal, discounts, shipping_total, tax and grand total.';
