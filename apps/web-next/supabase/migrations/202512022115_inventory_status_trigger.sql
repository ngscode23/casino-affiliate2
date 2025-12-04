-- Keep inventory_status in sync with stock_quantity / is_available / status
-- so that storefront logic can rely on a single normalized field.

begin;

create or replace function public.set_ecom_products_inventory_status()
returns trigger
language plpgsql
as $$
begin
  new.inventory_status :=
    public.compute_inventory_status(
      new.status,
      coalesce(new.stock_quantity, 0),
      coalesce(new.is_available, true)
    );
  return new;
end;
$$;

drop trigger if exists ecom_products_inventory_status_trg on public.ecom_products;

create trigger ecom_products_inventory_status_trg
before insert or update of status, stock_quantity, is_available
on public.ecom_products
for each row
execute function public.set_ecom_products_inventory_status();

commit;

