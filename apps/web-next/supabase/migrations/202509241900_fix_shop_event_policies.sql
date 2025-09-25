-- Ensure shop_* tables allow inserts via RLS
alter table public.shop_clicks enable row level security;
alter table public.shop_impressions enable row level security;

drop policy if exists "Anyone can insert shop clicks" on public.shop_clicks;
create policy "Anyone can insert shop clicks" on public.shop_clicks
  for insert with check (true);

drop policy if exists "Anyone can insert shop impressions" on public.shop_impressions;
create policy "Anyone can insert shop impressions" on public.shop_impressions
  for insert with check (true);
