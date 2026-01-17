-- Automation queue for supplier feed processing
create table if not exists public.automation_queue (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  vendor_sku text not null,
  status text not null default 'pending',
  reason text null,
  sku_id uuid null references public.ecom_products(id) on delete set null,
  candidate_skus uuid[] null,
  payload_snapshot jsonb null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists automation_queue_supplier_vendor_idx
  on public.automation_queue (supplier_id, vendor_sku);

create index if not exists automation_queue_status_idx
  on public.automation_queue (status);

create index if not exists automation_queue_supplier_status_idx
  on public.automation_queue (supplier_id, status);

alter table public.automation_queue
  add constraint automation_queue_status_check
  check (status in ('pending', 'matched', 'created', 'conflict', 'error', 'done'));
