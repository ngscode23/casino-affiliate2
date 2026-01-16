-- Use WHERE clauses to satisfy safe-update policies
create or replace function public.admin_reset_catalog_models()
returns jsonb
language plpgsql
security definer
set search_path = catalog, public
as $$
declare
  result jsonb := '{}'::jsonb;
  deleted_count bigint;
begin
  delete from catalog.product_media where id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.product_media', deleted_count);

  delete from catalog.product_filters where product_id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.product_filters', deleted_count);

  delete from catalog.product_categories where product_id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.product_categories', deleted_count);

  delete from catalog.product_stats where product_id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.product_stats', deleted_count);

  delete from catalog.events where id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.events', deleted_count);

  delete from catalog.products where id is not null;
  get diagnostics deleted_count = row_count;
  result := result || jsonb_build_object('catalog.products', deleted_count);

  return result;
end;
$$;

grant execute on function public.admin_reset_catalog_models() to authenticated;
