-- Migration from supabase/clicks_ip_hash.sql
-- Add ip_hash column (hashed IP) for privacy-friendly deduplication
alter table public.clicks add column if not exists ip_hash text;


