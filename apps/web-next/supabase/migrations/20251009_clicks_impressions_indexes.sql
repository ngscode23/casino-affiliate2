-- Performance indexes for tracking tables
-- Speeds up RPC de-dup checks and analytics aggregations

-- Clicks
create index if not exists idx_shop_clicks_ts on public.shop_clicks (ts);
create index if not exists idx_shop_clicks_slug_ts on public.shop_clicks (slug, ts);
create index if not exists idx_shop_clicks_referrer_ts on public.shop_clicks (referrer, ts);

-- Impressions
create index if not exists idx_shop_impressions_ts on public.shop_impressions (ts);
create index if not exists idx_shop_impressions_slug_ts on public.shop_impressions (slug, ts);
create index if not exists idx_shop_impressions_referrer_ts on public.shop_impressions (referrer, ts);

