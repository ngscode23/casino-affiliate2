-- Ensure orders table contains fields required for Stripe flow
alter table if exists public.orders
  add column if not exists amount_cents bigint,
  add column if not exists currency text,
  add column if not exists status text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_intent_id text;

-- Normalize default values for existing rows
update public.orders
set
  status = coalesce(nullif(trim(lower(status)), ''), 'pending'),
  currency = coalesce(nullif(trim(currency), ''), 'usd')
where status is null
   or trim(status) = ''
   or currency is null
   or trim(currency) = '';

-- Create helper indexes to speed up queries
create index if not exists orders_payment_intent_id_idx on public.orders using btree (payment_intent_id);
create index if not exists orders_status_idx on public.orders using btree (status);

-- Ensure payments table keeps provider_ref in sync
create index if not exists payments_provider_ref_idx on public.payments using btree (provider_ref);
\nupdate public.orders set status = 'paid' where lower(status) = 'succeeded';\nupdate public.orders set status = 'pending' where lower(status) in ('processing', 'authorized');\n
