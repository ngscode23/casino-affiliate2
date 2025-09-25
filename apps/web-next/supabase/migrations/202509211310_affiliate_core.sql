-- Core shop schema: products + events (product_clicks, product_impressions)
create extension if not exists pgcrypto;

-- Backward-compatible rename if legacy tables exist
do $$
begin
  if to_regclass('public.offers') is not null and to_regclass('public.products') is null then
    execute 'alter table public.offers rename to products';
  end if;
  if to_regclass('public.clicks') is not null and to_regclass('public.product_clicks') is null then
    begin
      execute 'alter table public.clicks rename column offer_id to product_id';
    exception when undefined_column then
      -- ignore if already renamed
      null;
    end;
    execute 'alter table public.clicks rename to product_clicks';
  end if;
  if to_regclass('public.impressions') is not null and to_regclass('public.product_impressions') is null then
    begin
      execute 'alter table public.impressions rename column offer_id to product_id';
    exception when undefined_column then
      null;
    end;
    execute 'alter table public.impressions rename to product_impressions';
  end if;
end $$;

-- Products catalog
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  sku text unique,
  stock integer not null default 0,
  main_image_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Public read of active products
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products
  for select using (status = 'active');

-- Product Click events
create table if not exists public.product_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  referrer text,
  session_id text
);

alter table public.product_clicks enable row level security;

-- Allow anyone to insert product click events (no read by default)
drop policy if exists "Anyone can insert product clicks" on public.product_clicks;
create policy "Anyone can insert product clicks" on public.product_clicks
  for insert with check (true);

create index if not exists product_clicks_product_created_idx on public.product_clicks (product_id, created_at desc);

-- Product Impression events
create table if not exists public.product_impressions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  referrer text,
  session_id text
);

alter table public.product_impressions enable row level security;

-- Allow anyone to insert product impressions (no read by default)
drop policy if exists "Anyone can insert product impressions" on public.product_impressions;
create policy "Anyone can insert product impressions" on public.product_impressions
  for insert with check (true);

create index if not exists product_impressions_product_created_idx on public.product_impressions (product_id, created_at desc);

-- Grants: basic privileges for anon/authenticated (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert on table public.product_clicks to anon, authenticated;
grant insert on table public.product_impressions to anon, authenticated;
