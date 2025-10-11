-- Track processed Stripe webhook events to enforce idempotency
create table if not exists public.processed_events (
  event_id text primary key,
  event_type text,
  created_at timestamptz default now()
);

