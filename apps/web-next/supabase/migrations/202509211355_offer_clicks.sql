-- Offer click logging table for go redirects
create table if not exists public.offer_clicks (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  click_id text,
  target_url text,
  target_url_final text,
  target_host text,
  params jsonb default '{}'::jsonb,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.offer_clicks enable row level security;

drop policy if exists "Anyone can insert offer clicks" on public.offer_clicks;
create policy "Anyone can insert offer clicks" on public.offer_clicks
  for insert with check (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.offer_clicks to anon, authenticated;

create index if not exists offer_clicks_slug_created_idx on public.offer_clicks (slug, created_at desc);
