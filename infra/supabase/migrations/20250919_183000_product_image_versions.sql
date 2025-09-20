set check_function_bodies = off;

create table if not exists public.ecom_product_image_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ecom_products(id) on delete cascade,
  sku text not null,
  path text not null,
  source_url text,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid,
  is_current boolean not null default false,
  metadata jsonb
);

create index if not exists idx_product_image_versions_product_id on public.ecom_product_image_versions(product_id);
create index if not exists idx_product_image_versions_sku on public.ecom_product_image_versions(sku);
create index if not exists idx_product_image_versions_current on public.ecom_product_image_versions(product_id) where is_current;

create or replace function public.ecom_product_image_versions_set_current()
returns trigger language plpgsql as 205
begin
  if new.is_current then
    update public.ecom_product_image_versions
      set is_current = false
    where product_id = new.product_id
      and id <> coalesce(new.id, old.id);
  end if;
  return new;
end;
205;

drop trigger if exists trg_product_image_versions_current on public.ecom_product_image_versions;
create trigger trg_product_image_versions_current
  before insert or update on public.ecom_product_image_versions
  for each row
  execute function public.ecom_product_image_versions_set_current();

comment on table public.ecom_product_image_versions is 'Versioned product images uploaded via admin signed URLs';

