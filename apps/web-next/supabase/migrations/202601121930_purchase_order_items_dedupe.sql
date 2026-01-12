-- Ensure purchase_order_items are idempotent per PO/order_item pair.
-- This prevents duplicate rows if PO creation is retried.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.purchase_order_items'::regclass
      and conname = 'purchase_order_items_po_order_item_key'
  ) then
    alter table public.purchase_order_items
      add constraint purchase_order_items_po_order_item_key
      unique (purchase_order_id, order_item_id);
  end if;
end
$$;

