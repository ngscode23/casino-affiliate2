-- Phase 2: ensure one current offer per supplier+sku for upsert logic
create unique index if not exists supplier_offers_supplier_sku_key
  on public.supplier_offers (supplier_id, sku_id);
