-- Phase 1: dropship model scaffolding (offers/inventory/addresses/ops)

create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  sku_id uuid not null references public.ecom_products(id) on delete cascade,
  supplier_sku_id uuid null references public.supplier_skus(id) on delete set null,
  price_cents bigint not null check (price_cents >= 0),
  currency text not null check (char_length(currency) = 3),
  cost_cents bigint null check (cost_cents is null or cost_cents >= 0),
  lead_time_days integer null check (lead_time_days is null or lead_time_days >= 0),
  min_order_qty integer not null default 1 check (min_order_qty >= 1),
  max_order_qty integer null check (max_order_qty is null or max_order_qty >= min_order_qty),
  valid_from timestamptz not null default now(),
  valid_to timestamptz null,
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index supplier_offers_supplier_sku_valid_from_key
  on public.supplier_offers (supplier_id, sku_id, valid_from);
create index supplier_offers_sku_status_idx
  on public.supplier_offers (sku_id, status);
create index supplier_offers_supplier_status_idx
  on public.supplier_offers (supplier_id, status);
create index supplier_offers_valid_to_idx
  on public.supplier_offers (valid_to);
create index supplier_offers_supplier_sku_id_idx
  on public.supplier_offers (supplier_sku_id);

create table public.supplier_inventory_levels (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  sku_id uuid not null references public.ecom_products(id) on delete cascade,
  supplier_sku_id uuid null references public.supplier_skus(id) on delete set null,
  stock_quantity integer null check (stock_quantity is null or stock_quantity >= 0),
  is_available boolean null,
  inventory_status text null,
  last_synced_at timestamptz null,
  source text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index supplier_inventory_levels_supplier_sku_key
  on public.supplier_inventory_levels (supplier_id, sku_id);
create index supplier_inventory_levels_sku_idx
  on public.supplier_inventory_levels (sku_id);
create index supplier_inventory_levels_supplier_idx
  on public.supplier_inventory_levels (supplier_id);
create index supplier_inventory_levels_status_idx
  on public.supplier_inventory_levels (inventory_status);
create index supplier_inventory_levels_available_idx
  on public.supplier_inventory_levels (is_available);
create index supplier_inventory_levels_synced_idx
  on public.supplier_inventory_levels (last_synced_at);

create table public.supplier_policies (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  lead_time_days integer null check (lead_time_days is null or lead_time_days >= 0),
  ship_from_country text null,
  ship_to_countries text[] null,
  return_policy text null,
  sla_hours integer null check (sla_hours is null or sla_hours >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supplier_policies_ship_from_idx
  on public.supplier_policies (ship_from_country);

create table public.order_shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  full_name text null,
  phone text null,
  email text null,
  address1 text null,
  address2 text null,
  city text null,
  region text null,
  postal_code text null,
  country text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index order_shipping_addresses_order_id_key
  on public.order_shipping_addresses (order_id);

create table public.order_billing_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  full_name text null,
  phone text null,
  email text null,
  address1 text null,
  address2 text null,
  city text null,
  region text null,
  postal_code text null,
  country text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index order_billing_addresses_order_id_key
  on public.order_billing_addresses (order_id);

create table public.ops_event_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text null,
  created_at timestamptz not null default now()
);

create index ops_event_log_entity_idx
  on public.ops_event_log (entity_type, entity_id, created_at desc);
create index ops_event_log_type_idx
  on public.ops_event_log (event_type);

create table public.ops_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'failed')),
  request_hash text null,
  response jsonb null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create unique index ops_idempotency_keys_scope_key
  on public.ops_idempotency_keys (scope, idempotency_key);
create index ops_idempotency_keys_expires_idx
  on public.ops_idempotency_keys (expires_at);
create index ops_idempotency_keys_status_idx
  on public.ops_idempotency_keys (status);

alter table public.supplier_offers enable row level security;
alter table public.supplier_inventory_levels enable row level security;
alter table public.supplier_policies enable row level security;
alter table public.order_shipping_addresses enable row level security;
alter table public.order_billing_addresses enable row level security;
alter table public.ops_event_log enable row level security;
alter table public.ops_idempotency_keys enable row level security;

create policy supplier_offers_admin_all on public.supplier_offers
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy supplier_offers_service_all on public.supplier_offers
  for all to service_role
  using (true)
  with check (true);

create policy supplier_inventory_admin_all on public.supplier_inventory_levels
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy supplier_inventory_service_all on public.supplier_inventory_levels
  for all to service_role
  using (true)
  with check (true);

create policy supplier_policies_admin_all on public.supplier_policies
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy supplier_policies_service_all on public.supplier_policies
  for all to service_role
  using (true)
  with check (true);

create policy order_shipping_addresses_owner on public.order_shipping_addresses
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_shipping_addresses.order_id
        and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_shipping_addresses.order_id
        and o.user_id = auth.uid()
    )
  );
create policy order_shipping_addresses_service_all on public.order_shipping_addresses
  for all to service_role
  using (true)
  with check (true);

create policy order_billing_addresses_owner on public.order_billing_addresses
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_billing_addresses.order_id
        and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_billing_addresses.order_id
        and o.user_id = auth.uid()
    )
  );
create policy order_billing_addresses_service_all on public.order_billing_addresses
  for all to service_role
  using (true)
  with check (true);

create policy ops_event_log_admin_all on public.ops_event_log
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy ops_event_log_service_all on public.ops_event_log
  for all to service_role
  using (true)
  with check (true);

create policy ops_idempotency_admin_all on public.ops_idempotency_keys
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy ops_idempotency_service_all on public.ops_idempotency_keys
  for all to service_role
  using (true)
  with check (true);
