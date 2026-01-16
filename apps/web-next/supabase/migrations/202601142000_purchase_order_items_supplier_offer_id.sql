-- Phase 3: link purchase order items to the chosen supplier offer
alter table public.purchase_order_items
  add column if not exists supplier_offer_id uuid references public.supplier_offers(id) on delete set null;

create index if not exists purchase_order_items_supplier_offer_id_idx
  on public.purchase_order_items (supplier_offer_id);
