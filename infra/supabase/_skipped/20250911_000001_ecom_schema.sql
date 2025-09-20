-- e-commerce base schema (categories, products, wishlist)
-- Creates tables, indexes, and RLS policies

-- extensions
create extension if not exists pgcrypto;

-- categories
create table if not exists public.ecom_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);

-- products
create table if not exists public.ecom_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  price numeric(10,2) not null,
  rating real not null default 0,
  images jsonb not null default '[]'::jsonb,
  category_slug text references public.ecom_categories(slug) on delete set null,
  tags text[] not null default '{}',
  short_desc text,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- wishlist (per-user)
create table if not exists public.ecom_wishlist (
  user_id uuid not null,
  product_id uuid not null references public.ecom_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- helpful indexes
create index if not exists ecom_products_category_idx on public.ecom_products (category_slug);
create index if not exists ecom_products_price_idx on public.ecom_products (price);
create index if not exists ecom_products_rating_idx on public.ecom_products (rating);
create index if not exists ecom_products_title_gin on public.ecom_products using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(short_desc,'')));

-- RLS
alter table public.ecom_categories enable row level security;
alter table public.ecom_products   enable row level security;
alter table public.ecom_wishlist   enable row level security;

-- public read for products & categories
drop policy if exists "ecom_categories_public_read" on public.ecom_categories;
create policy "ecom_categories_public_read"
  on public.ecom_categories for select
  using (true);

drop policy if exists "ecom_products_public_read" on public.ecom_products;
create policy "ecom_products_public_read"
  on public.ecom_products for select
  using (true);

-- wishlist: only owner can read/write
drop policy if exists "ecom_wishlist_owner_read" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_read"
  on public.ecom_wishlist for select
  using (auth.uid() = user_id);

drop policy if exists "ecom_wishlist_owner_insert" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_insert"
  on public.ecom_wishlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "ecom_wishlist_owner_delete" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_delete"
  on public.ecom_wishlist for delete
  using (auth.uid() = user_id);

-- seed minimal data (safe upserts)
insert into public.ecom_categories (slug, name, icon) values
  ('electronics','Electronics','Cpu'),
  ('gaming','Gaming','Gamepad2'),
  ('accessories','Accessories','Headphones'),
  ('home','Home','Home'),
  ('outdoors','Outdoors','Tent'),
  ('software','Software','Box')
on conflict (slug) do update set name = excluded.name, icon = excluded.icon;

-- few demo products
insert into public.ecom_products (slug, title, price, rating, images, category_slug, tags, short_desc, specs) values
  ('alpha-headphones','Alpha Headphones',79.99,4.4,'["https://via.placeholder.com/800x500?text=Alpha"]','accessories',array['audio','wireless'],'Comfortable over-ear wireless headphones.','{"Connectivity":"Bluetooth 5.2"}'),
  ('beta-keyboard','Beta Mechanical Keyboard',59.99,4.2,'["https://via.placeholder.com/800x500?text=Keyboard"]','accessories',array['keyboard'],'Compact 75% mechanical keyboard with RGB.','{"Switches":"Brown"}'),
  ('gamma-mouse','Gamma Gaming Mouse',39.99,4.1,'["https://via.placeholder.com/800x500?text=Mouse"]','gaming',array['mouse'],'Lightweight mouse with precise sensor.','{"DPI":"16000"}'),
  ('omega-monitor','Omega 27\'' Monitor',229.00,4.6,'["https://via.placeholder.com/800x500?text=Monitor"]','electronics',array['display'],'27-inch 144Hz IPS monitor.','{"Refresh":"144Hz"}'),
  ('delta-speaker','Delta Bluetooth Speaker',45.00,4.0,'["https://via.placeholder.com/800x500?text=Speaker"]','electronics',array['audio'],'Portable speaker with rich sound.','{"Battery":"12h"}'),
  ('epsilon-smartlight','Epsilon Smart Light',19.99,3.9,'["https://via.placeholder.com/800x500?text=Light"]','home',array['light'],'Smart LED bulb with app control.','{"Socket":"E27"}')
on conflict (slug) do update set title = excluded.title, price = excluded.price, rating = excluded.rating, images = excluded.images, category_slug = excluded.category_slug, tags = excluded.tags, short_desc = excluded.short_desc, specs = excluded.specs;

