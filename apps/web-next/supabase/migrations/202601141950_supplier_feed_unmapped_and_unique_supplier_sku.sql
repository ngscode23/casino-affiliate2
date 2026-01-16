create table if not exists public.supplier_feed_unmapped (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  vendor_sku text not null,
  last_seen_at timestamptz not null default now(),
  sample_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists supplier_feed_unmapped_supplier_vendor_key
  on public.supplier_feed_unmapped (supplier_id, vendor_sku);

create index if not exists supplier_feed_unmapped_last_seen_at_idx
  on public.supplier_feed_unmapped (last_seen_at desc);

create unique index if not exists supplier_skus_supplier_vendor_key
  on public.supplier_skus (supplier_id, supplier_sku)
  where supplier_sku is not null;
