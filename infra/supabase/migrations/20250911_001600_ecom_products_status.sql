-- Add status to ecom_products: draft | published | archived
alter table if exists public.ecom_products
  add column if not exists status text not null default 'published' check (status in ('draft','published','archived'));

create index if not exists ecom_products_status_idx on public.ecom_products(status);

