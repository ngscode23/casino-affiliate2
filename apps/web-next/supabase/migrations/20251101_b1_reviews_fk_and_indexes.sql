begin;

-- Ensure product_review_replies.product_id is uuid (cast if needed)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='product_review_replies'
      and column_name='product_id'
      and udt_name <> 'uuid'
  ) then
    execute 'alter table public.product_review_replies alter column product_id type uuid using product_id::uuid';
  end if;
end $$;

-- Recreate FK to ecom_products(id)
alter table if exists public.product_review_replies drop constraint if exists product_review_replies_product_fk;
alter table if exists public.product_review_replies
  add constraint product_review_replies_product_fk foreign key (product_id) references public.ecom_products(id);

-- Drop suspicious FK to trash.sellers if exists
alter table if exists public.ecom_products drop constraint if exists ecom_products_seller_id_fkey;

-- Indexes for common FKs and queries
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_shop_clicks_prod_created on public.shop_clicks(product_id, created_at);
create index if not exists idx_shop_impressions_prod_created on public.shop_impressions(product_id, created_at);
create index if not exists idx_product_impressions_prod_created on public.product_impressions(product_id, created_at);
create index if not exists idx_review_msgs_prod_created on public.product_review_messages(product_id, created_at);
create index if not exists idx_recent_views_user_seen on public.recent_views(user_id, seen_at);
create index if not exists idx_refresh_tokens_user_exp on public.refresh_tokens(user_id, expires_at);

commit;

