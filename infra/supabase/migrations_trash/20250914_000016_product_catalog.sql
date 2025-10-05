-- Minimal product_catalog table to keep unified references (optional helper for admin sync)
begin;

create table if not exists public.product_catalog (
  source_schema text not null,
  source_table  text not null,
  source_pk     text not null,
  title         text,
  slug          text,
  created_at    timestamptz not null default now(),
  primary key (source_schema, source_table, source_pk)
);

commit;

