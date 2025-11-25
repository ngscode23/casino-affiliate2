-- Hero campaigns for homepage hero banner

-- helper to keep updated_at in sync (idempotent)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $func$
    begin
      new.updated_at = now();
      return new;
    end
    $func$;
  end if;
end$$;

create table if not exists public.hero_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  eyebrow text,
  body text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  image_url text,
  image_alt text,
  theme text default 'dark',
  priority int default 0,
  start_at timestamptz default now(),
  end_at timestamptz,
  segment_locale text,
  segment_country text,
  segment_currency text,
  variant text default 'A',
  tracking_id text,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists hero_campaigns_active_idx on public.hero_campaigns (published, start_at, end_at, priority desc);
create index if not exists hero_campaigns_segment_idx on public.hero_campaigns (segment_locale, segment_country, segment_currency);

create trigger hero_campaigns_set_updated_at
before update on public.hero_campaigns
for each row execute procedure public.set_updated_at();

alter table public.hero_campaigns enable row level security;

-- read-only for public site (only published & active by time window)
create policy hero_campaigns_public_read
on public.hero_campaigns
for select
to anon, authenticated
using (
  published = true
  and (start_at is null or start_at <= now())
  and (end_at is null or end_at >= now())
);

-- full access for service role (admin jobs / webhooks)
create policy hero_campaigns_service_all
on public.hero_campaigns
for all
to service_role
using (true)
with check (true);
