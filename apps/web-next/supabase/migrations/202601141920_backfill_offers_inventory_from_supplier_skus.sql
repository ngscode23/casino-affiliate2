-- Phase 2: backfill offers/inventory from existing supplier_skus
insert into public.supplier_inventory_levels (
  supplier_id,
  sku_id,
  supplier_sku_id,
  stock_quantity,
  is_available,
  inventory_status,
  last_synced_at,
  source,
  metadata,
  created_at,
  updated_at
)
select
  s.supplier_id,
  s.sku_id,
  s.id,
  s.stock_quantity,
  s.is_available,
  s.inventory_status,
  s.last_synced_at,
  'backfill',
  jsonb_build_object('source', 'supplier_skus', 'backfilled_at', now()),
  now(),
  now()
from public.supplier_skus s
on conflict (supplier_id, sku_id) do nothing;

insert into public.supplier_offers (
  supplier_id,
  sku_id,
  supplier_sku_id,
  price_cents,
  currency,
  cost_cents,
  lead_time_days,
  min_order_qty,
  max_order_qty,
  valid_from,
  valid_to,
  status,
  metadata,
  created_at,
  updated_at
)
select
  s.supplier_id,
  s.sku_id,
  s.id,
  coalesce(p.price_cents, (p.price * 100)::bigint),
  upper(coalesce(p.currency, s.currency)),
  s.cost_cents,
  s.lead_time_days,
  1,
  null,
  coalesce(s.last_synced_at, now()),
  null,
  'active',
  jsonb_build_object('source', 'supplier_skus', 'backfilled_at', now()),
  now(),
  now()
from public.supplier_skus s
left join public.ecom_products p on p.id = s.sku_id
where coalesce(p.price_cents, (p.price * 100)::bigint) is not null
  and coalesce(p.currency, s.currency) is not null
  and length(coalesce(p.currency, s.currency)) = 3
on conflict (supplier_id, sku_id) do nothing;
