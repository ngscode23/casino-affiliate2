-- Webhook logs table with RLS (authenticated select only)
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.webhook_logs enable row level security;

drop policy if exists "auth read webhooks" on public.webhook_logs;
create policy "auth read webhooks"
on public.webhook_logs for select
to authenticated
using (true);

