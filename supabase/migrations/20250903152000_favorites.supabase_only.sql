-- Favorites table with strict RLS (per-user)

create table if not exists public.favorites (
  user_id uuid not null,
  offer_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, offer_id)
);

-- Helpful index for recent items per user
create index if not exists idx_favorites_user_created_at
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

-- Read own
drop policy if exists "favorites read own" on public.favorites;
create policy "favorites read own"
  on public.favorites for select
  to authenticated
  using (user_id = auth.uid());

-- Write own (insert/update/delete)
drop policy if exists "favorites write own" on public.favorites;
create policy "favorites write own"
  on public.favorites for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

