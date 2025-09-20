-- supabase/impressions.sql
-- Lightweight impressions table to compute CTR

create table if not exists public.impressions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  ts timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  referer text,
  device text,
  lang text
);

-- Helpful indexes
create index if not exists impressions_ts_idx on public.impressions (ts desc);
create index if not exists impressions_slug_ts_idx on public.impressions (slug, ts desc);
create index if not exists impressions_device_ts_idx on public.impressions (device, ts desc);

-- RLS
alter table public.impressions enable row level security;

-- Allow authenticated users to read impressions (for admin dashboards)
drop policy if exists "auth read impressions" on public.impressions;
create policy "auth read impressions"
  on public.impressions for select
  to authenticated
  using (true);

-- Note: inserts are performed from server (service role) only

