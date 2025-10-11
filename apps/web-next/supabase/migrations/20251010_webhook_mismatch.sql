-- Extend stripe_webhooks with diagnostic fields for amount reconciliation
alter table if exists public.stripe_webhooks
  add column if not exists mismatch_reason text,
  add column if not exists expected_amount_cents integer,
  add column if not exists expected_currency text;

