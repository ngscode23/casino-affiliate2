-- Migration from supabase/partners.sql
-- Ensure required extension exists for gen_random_uuid()
create extension if not exists pgcrypto;

-- Partners and paid placements
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  plan text not null, -- BASIC | FEATURED | TOP
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint partners_plan_chk check (plan in ('BASIC', 'FEATURED', 'TOP'))
);

-- Ensure single partner per (email, plan) for idempotent upserts from webhook
create unique index if not exists partners_email_plan_uidx on public.partners (email, plan);

create table if not exists public.partner_offers (
  partner_id uuid not null references public.partners(id) on delete cascade,
  offer_slug text not null references public.offers(slug) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (partner_id, offer_slug)
);

-- Helpful partial indexes for typical reads
create index if not exists partner_offers_pinned_slug_idx on public.partner_offers (offer_slug) where pinned = true;
create index if not exists partners_expires_at_active_idx on public.partners (expires_at) where expires_at is not null;

alter table public.partners enable row level security;
alter table public.partner_offers enable row level security;

-- Authenticated can manage partners (admin app). Adjust if you have roles.
drop policy if exists "auth manage partners" on public.partners;
create policy "auth manage partners" on public.partners
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "auth manage partner_offers" on public.partner_offers;
create policy "auth manage partner_offers" on public.partner_offers
  for all
  to authenticated
  using (true)
  with check (true);

-- RPC to expose pinned slugs to public without exposing partners data
create or replace function public.pinned_offer_slugs()
returns setof text
language sql
security definer
set search_path = public
as $$
  select distinct po.offer_slug
  from public.partner_offers po
  join public.partners p on p.id = po.partner_id
  where po.pinned = true
    and (p.expires_at is null or p.expires_at > now());
$$;

grant execute on function public.pinned_offer_slugs() to anon, authenticated;

-- Optional: expose pinned slugs with plan for UI badges
create or replace function public.pinned_offer_meta()
returns table(offer_slug text, plan text)
language sql
security definer
set search_path = public
as $$
  select distinct po.offer_slug, p.plan
  from public.partner_offers po
  join public.partners p on p.id = po.partner_id
  where po.pinned = true
    and (p.expires_at is null or p.expires_at > now());
$$;

grant execute on function public.pinned_offer_meta() to anon, authenticated;

-- RPC to expire pins for expired partners
create or replace function public.expire_partner_pins()
returns void
language sql
security definer
set search_path = public
as $$
  update public.partner_offers po
  set pinned = false
  from public.partners p
  where p.id = po.partner_id
    and po.pinned = true
    and p.expires_at is not null
    and p.expires_at <= now();
$$;

grant execute on function public.expire_partner_pins() to anon, authenticated;

