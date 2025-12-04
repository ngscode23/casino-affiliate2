DROP VIEW IF EXISTS public.payment_refunds_v;

CREATE VIEW public.payment_refunds_v AS
SELECT
  id::text                          AS refund_id,
  order_id,
  NULL::text                       AS payment_intent_id,
  CASE
    WHEN amount IS NULL THEN NULL
    ELSE COALESCE(round(amount * 100)::bigint, 0)
  END                              AS amount_cents,
  upper(COALESCE(currency, 'USD')) AS currency,
  reason,
  status,
  created_at
FROM public.payment_refunds;

COMMENT ON VIEW public.payment_refunds_v IS
  'Compatibility view that exposes payment_refunds rows with refund_id/text ids and amount in cents for SDK consumers.';

GRANT SELECT ON public.payment_refunds_v TO anon, authenticated, service_role;
