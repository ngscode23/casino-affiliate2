-- Fresh event tables decoupled from legacy schema
create extension if not exists pgcrypto;

drop table if exists public.shop_clicks cascade;
create table public.shop_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ecom_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  referrer text,
  session_id text
);

drop table if exists public.shop_impressions cascade;
create table public.shop_impressions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ecom_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  referrer text,
  session_id text
);

alter table public.shop_clicks enable row level security;
alter table public.shop_impressions enable row level security;

drop policy if exists "Anyone can insert shop clicks" on public.shop_clicks;
create policy "Anyone can insert shop clicks" on public.shop_clicks
  for insert using (true);

drop policy if exists "Anyone can insert shop impressions" on public.shop_impressions;
create policy "Anyone can insert shop impressions" on public.shop_impressions
  for insert using (true);

create index if not exists shop_clicks_product_created_idx on public.shop_clicks (product_id, created_at desc);
create index if not exists shop_impressions_product_created_idx on public.shop_impressions (product_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant insert on table public.shop_clicks to anon, authenticated;
grant insert on table public.shop_impressions to anon, authenticated;
