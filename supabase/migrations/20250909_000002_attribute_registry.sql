-- BLOCK 2 — ATTRIBUTE REGISTRY + DYNAMIC FILTERS/TABLE
-- Minimal schema to support dynamic filters & compare table

-- attributes_registry: the source of truth for attributes metadata
create table if not exists public.attributes_registry (
  key           text primary key,
  label_key     text not null, -- i18n key for human-readable label
  type          text not null check (type in ('text','number','bool','enum','multi_enum')),
  comparable    boolean not null default false,
  facetable     boolean not null default false,
  unit          text null,
  sort_default  integer null
);



-- product_attributes: attribute values for each product/offer
create table if not exists public.product_attributes (
  product_id uuid not null,
  key        text not null references public.attributes_registry(key) on delete cascade,
  value      jsonb not null,
  primary key (product_id, key)
);

-- helper index for faceting by key
create index if not exists idx_product_attributes_key on public.product_attributes(key);

