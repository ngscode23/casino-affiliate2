-- Offers table + RLS policies for Supabase
-- Run this SQL in your Supabase project SQL editor.

create table if not exists public.offers (
  slug text primary key,
  name text not null,
  rating numeric check (rating >= 0 and rating <= 5),
  license text not null default 'Other',
  payout text,
  payout_hours integer,
  methods text[] default '{}',
  link text,
  enabled boolean not null default true,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

-- Recommended index for ordering
create index if not exists idx_offers_enabled on public.offers(enabled);
create index if not exists idx_offers_position on public.offers(position);

-- Enable RLS
alter table public.offers enable row level security;

-- Policies
-- 1) Public (anon) can read only enabled rows
drop policy if exists "Public read enabled offers" on public.offers;
create policy "Public read enabled offers"
on public.offers for select
to anon
using (enabled = true);

-- 2) Authenticated can read all rows
drop policy if exists "Auth read all offers" on public.offers;
create policy "Auth read all offers"
on public.offers for select
to authenticated
using (true);

-- 3) Authenticated can insert/update/delete
drop policy if exists "Auth write offers" on public.offers;
create policy "Auth write offers"
on public.offers for all
to authenticated
using (true)
with check (true);

-- Optional: constrain license values (text domain alternative)
-- comment on column public.offers.license is 'MGA|UKGC|Curaçao|Other';

