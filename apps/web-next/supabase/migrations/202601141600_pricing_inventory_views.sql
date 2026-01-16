-- Phase 2: pricing/inventory views over public tables

create schema if not exists pricing;
create schema if not exists inventory;

create or replace view pricing.active_offers_v
with (security_barrier = true) as
select
  o.id,
  o.supplier_id,
  o.sku_id,
  o.supplier_sku_id,
  o.price_cents,
  o.currency,
  o.cost_cents,
  o.lead_time_days,
  o.min_order_qty,
  o.max_order_qty,
  o.valid_from,
  o.valid_to,
  o.status,
  o.metadata,
  o.created_at,
  o.updated_at
from public.supplier_offers o
where o.status = 'active'
  and (o.valid_to is null or o.valid_to >= now());

create or replace view inventory.sku_availability_v
with (security_barrier = true) as
select
  i.id,
  i.supplier_id,
  i.sku_id,
  i.supplier_sku_id,
  i.stock_quantity,
  i.is_available,
  i.inventory_status,
  i.last_synced_at,
  i.source,
  i.metadata,
  i.created_at,
  i.updated_at
from public.supplier_inventory_levels i;

grant usage on schema pricing to anon, authenticated, service_role;
grant usage on schema inventory to anon, authenticated, service_role;

grant select on pricing.active_offers_v to anon, authenticated, service_role;
grant select on inventory.sku_availability_v to anon, authenticated, service_role;
