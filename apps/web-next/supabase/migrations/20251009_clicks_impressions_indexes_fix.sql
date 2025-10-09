-- Fix tracking indexes to match actual schema
-- We previously attempted to index (ts, slug, referrer) on shop_* which do not exist there.
-- This migration drops those placeholders (if any) and creates efficient indexes
-- for the real columns used by RPC de-dup and analytics windows.

-- Drop incorrect indexes if they slipped in
drop index if exists public.idx_shop_clicks_ts;
drop index if exists public.idx_shop_clicks_slug_ts;
drop index if exists public.idx_shop_clicks_referrer_ts;
drop index if exists public.idx_shop_impressions_ts;
drop index if exists public.idx_shop_impressions_slug_ts;
drop index if exists public.idx_shop_impressions_referrer_ts;

-- Core time indexes
create index if not exists idx_shop_clicks_created_at on public.shop_clicks (created_at desc);
create index if not exists idx_shop_impressions_created_at on public.shop_impressions (created_at desc);

-- Composite de-dup indexes (equality + time window)
create index if not exists idx_shop_clicks_dedupe on public.shop_clicks (product_id, session_id, referrer, created_at desc);
create index if not exists idx_shop_impressions_dedupe on public.shop_impressions (product_id, session_id, referrer, created_at desc);

-- Source analytics (referrer + time)
create index if not exists idx_shop_clicks_referrer_created_at on public.shop_clicks (referrer, created_at desc);
create index if not exists idx_shop_impressions_referrer_created_at on public.shop_impressions (referrer, created_at desc);

-- BRIN for very large time-series tables (cheap and effective for time filters)
create index if not exists brin_shop_clicks_created_at on public.shop_clicks using brin (created_at);
create index if not exists brin_shop_impressions_created_at on public.shop_impressions using brin (created_at);

