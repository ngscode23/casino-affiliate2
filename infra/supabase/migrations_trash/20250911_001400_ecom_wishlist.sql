-- Minimal wishlist table and RLS (standalone)
-- Safe if full ecom schema not installed

create table if not exists public.ecom_wishlist (
  user_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.ecom_wishlist enable row level security;

-- Only owner can read
drop policy if exists "ecom_wishlist_owner_read" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_read"
  on public.ecom_wishlist for select
  using (auth.uid() = user_id);

-- Only owner can insert own rows
drop policy if exists "ecom_wishlist_owner_insert" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_insert"
  on public.ecom_wishlist for insert
  with check (auth.uid() = user_id);

-- Only owner can delete own rows
drop policy if exists "ecom_wishlist_owner_delete" on public.ecom_wishlist;
create policy "ecom_wishlist_owner_delete"
  on public.ecom_wishlist for delete
  using (auth.uid() = user_id);

