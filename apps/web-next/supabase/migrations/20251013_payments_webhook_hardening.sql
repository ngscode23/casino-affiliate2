-- payments_webhook_hardening_v3

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'payment_status'
      and e.enumlabel = 'refunded'
  ) then
    alter type public.payment_status add value 'refunded';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'payment_status'
      and e.enumlabel = 'partial_refund'
  ) then
    alter type public.payment_status add value 'partial_refund';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'payment_status'
      and e.enumlabel = 'requires_action'
  ) then
    alter type public.payment_status add value 'requires_action';
  end if;
end
$$;

alter table if exists public.stripe_webhooks
  add column if not exists stripe_amount_cents integer,
  add column if not exists stripe_currency text,
  add column if not exists processing_state text,
  add column if not exists processing_error text,
  add column if not exists notified_succeeded boolean not null default false,
  add column if not exists notified_failed boolean not null default false,
  add column if not exists notified_refunded boolean not null default false,
  add column if not exists notified_desync boolean not null default false,
  add column if not exists notified_requires_action boolean not null default false;

create index if not exists stripe_webhooks_created_idx
  on public.stripe_webhooks (created_utc desc);

create index if not exists stripe_webhooks_type_idx
  on public.stripe_webhooks (type);

create table if not exists public.webhook_logs_app (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  event_type text,
  log_status text not null default 'info',
  http_status integer,
  source text,
  message text,
  error jsonb,
  created_at timestamptz not null default now()
);

create index if not exists webhook_logs_app_created_idx
  on public.webhook_logs_app (created_at desc);

create index if not exists webhook_logs_app_status_idx
  on public.webhook_logs_app (log_status);

create or replace function public.purge_processed_events(
  cutoff_ts timestamptz default now() - interval '14 days'
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  delete from public.processed_events
  where created_at is not null
    and created_at < cutoff_ts;
end;
$$;

revoke all on function public.purge_processed_events(timestamptz) from public;
grant execute on function public.purge_processed_events(timestamptz)
  to authenticated, service_role;

do $$
begin
  if to_regclass('cron.job') is not null then
    if not exists (
      select 1 from cron.job where jobname = 'purge_processed_events_daily'
    ) then
      perform cron.schedule(
        'purge_processed_events_daily',
        '15 3 * * *',
        'select public.purge_processed_events(now() - interval ''14 days'')'
      );
    end if;
  end if;
end
$$;
