-- Personalization data layer: user events & profiles + retention
set check_function_bodies = off;

-- Ensure required extensions are available (Supabase keeps them in the extensions schema)
create extension if not exists pg_cron with schema extensions;
create extension if not exists "uuid-ossp" with schema public;

create table if not exists public.user_events (
  id bigserial primary key,
  anon_id uuid not null,
  event text not null,
  product_id uuid null,
  category text null,
  price_bucket text null,
  device text null,
  country text null,
  referrer text null,
  experiment_variant text null,
  ts timestamptz not null default now()
  -- FK intentionally omitted: public.products is a view in this project
);

create index if not exists user_events_anon_ts_idx on public.user_events (anon_id, ts desc);
create index if not exists user_events_ts_idx on public.user_events (ts desc);
create index if not exists user_events_event_idx on public.user_events (event);

create table if not exists public.user_profiles (
  anon_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  visit_count integer not null default 0,
  device_pref text null,
  countries text[] not null default '{}',
  categories text[] not null default '{}',
  discount_affinity numeric(5,4) not null default 0,
  cold_start boolean not null default true,
  opt_out boolean not null default false,
  experiment_variant text null
);

create index if not exists user_profiles_updated_idx on public.user_profiles (updated_at desc);
create index if not exists user_profiles_last_seen_idx on public.user_profiles (last_seen desc);

alter table public.user_events enable row level security;
alter table public.user_profiles enable row level security;

-- TTL cleanup for events older than 30 days.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'user_events_ttl_30d') then
    perform cron.schedule(
      job_name   => 'user_events_ttl_30d',
      schedule   => '15 3 * * *',
      command    => $cmd$
        delete from public.user_events where ts < now() - interval '30 days';
      $cmd$
    );
  end if;
end$$;

comment on table public.user_events is 'Raw, non-PII event stream keyed by anon_id for personalization';
comment on table public.user_profiles is 'Aggregated personalization profiles (service-key only)';
