-- Add performance indexes for event tables (clicks, impressions)
-- Focus: fast dedup/rate-limit checks and time-range queries

-- Clicks: often queried by time windows and (planned) per-IP checks
create index if not exists clicks_ip_ts_idx
  on public.clicks (ip_hash, ts desc);

-- Impressions: dedup within 1h by (ip_hash + user_agent + slug) and ts filter
create index if not exists impressions_dedup_idx
  on public.impressions (ip_hash, user_agent, slug, ts desc);

-- Note:
-- Existing helpful indexes (kept):
--   clicks(ts desc), clicks(slug, ts desc), clicks(click_id)
--   impressions(ts desc), impressions(slug, ts desc), impressions(device, ts desc)
-- These new indexes avoid duplication and target distinct access patterns.
