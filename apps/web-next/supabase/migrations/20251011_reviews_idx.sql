-- Ensure fast lookups for product reviews listing and filters
create index if not exists idx_reviews_product on public.product_reviews_raw(product_id, status, created_at desc);
-- Support sorting by rating before created_at fallback
create index if not exists idx_reviews_sort_rating on public.product_reviews_raw(product_id, status, rating desc, created_at desc);

-- Stabilize pagination timestamps
alter table public.product_reviews_raw alter column created_at set default now();
alter table public.product_reviews_raw alter column created_at set not null;
