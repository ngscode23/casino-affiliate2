-- Guard against duplicate Stripe payment intents on orders
create unique index if not exists idx_orders_payment_intent_unique
  on public.orders ((trim(payment_intent_id)))
  where payment_intent_id is not null
    and trim(payment_intent_id) <> '';

