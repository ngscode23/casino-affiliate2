-- Inventory fields for Neon Shop products
-- Add stock/availability columns to the base table (ecom_products) and expose them via the public.products view.

begin;

-- 1) Add columns to the base table
alter table public.ecom_products
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists is_available boolean not null default true,
  add column if not exists inventory_status text;

comment on column public.ecom_products.stock_quantity is 'Текущее количество доступных единиц товара на складе';
comment on column public.ecom_products.is_available   is 'Флаг, что товар разрешён к продаже на витрине';
comment on column public.ecom_products.inventory_status is 'Нормализованный статус наличия: in_stock / out_of_stock / preorder / discontinued';

-- 2) Пересоздаём public.products, выбирая только реальные поля ecom_products + новые инвентарные.
drop view if exists public.products;
create view public.products as
select
  id,
  slug,
  title,
  description,
  short_desc,
  price,
  price_cents,
  currency,
  status,
  status_lc,
  category_slug,
  rating,
  created_at,
  deleted_at,
  image_path,
  main_image_url,
  images,
  tags,
  specs,
  sku,
  catalog_product_id,
  seller_id,
  to_delete,
  stock_quantity,
  is_available,
  inventory_status
from public.ecom_products;

-- Вью должна уважать RLS вызывающей роли
alter view public.products set (security_invoker = true);

-- 3) Helper: normalize inventory status (optional to use in triggers/views)
create or replace function public.compute_inventory_status(
  p_status text,
  p_stock_quantity integer,
  p_is_available boolean
) returns text
language sql
as $$
  select case
    when coalesce(p_is_available, true) = false then 'out_of_stock'
    when coalesce(p_stock_quantity, 0) > 0 then 'in_stock'
    when coalesce(p_status, '') in ('preorder','pre_order','pre-order','coming_soon') then 'preorder'
    else 'out_of_stock'
  end;
$$;

commit;
