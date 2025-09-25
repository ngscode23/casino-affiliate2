-- Fix product_* event tables if they were renamed from legacy tables with bigint IDs
do $$
declare
  coltype text;
begin
  -- product_clicks
  if to_regclass('public.product_clicks') is not null then
    select data_type into coltype
    from information_schema.columns
    where table_schema = 'public' and table_name = 'product_clicks' and column_name = 'product_id';

    if coltype is not null and lower(coltype) <> 'uuid' then
      execute 'alter table public.product_clicks rename to product_clicks_legacy';
      -- Recreate with correct schema (uuid FK)
      execute $$
        create table public.product_clicks (
          id uuid primary key default gen_random_uuid(),
          product_id uuid not null references public.products(id) on delete cascade,
          created_at timestamptz not null default now(),
          ip inet,
          user_agent text,
          referrer text,
          session_id text
        );
      $$;
      execute 'alter table public.product_clicks enable row level security';
      execute 'drop policy if exists "Anyone can insert product clicks" on public.product_clicks';
      execute 'create policy "Anyone can insert product clicks" on public.product_clicks for insert with check (true)';
      execute 'create index if not exists product_clicks_product_created_idx on public.product_clicks (product_id, created_at desc)';
      execute 'grant insert on table public.product_clicks to anon, authenticated';
    end if;
  end if;

  -- product_impressions
  if to_regclass('public.product_impressions') is not null then
    select data_type into coltype
    from information_schema.columns
    where table_schema = 'public' and table_name = 'product_impressions' and column_name = 'product_id';

    if coltype is not null and lower(coltype) <> 'uuid' then
      execute 'alter table public.product_impressions rename to product_impressions_legacy';
      -- Recreate with correct schema (uuid FK)
      execute $$
        create table public.product_impressions (
          id uuid primary key default gen_random_uuid(),
          product_id uuid not null references public.products(id) on delete cascade,
          created_at timestamptz not null default now(),
          ip inet,
          user_agent text,
          referrer text,
          session_id text
        );
      $$;
      execute 'alter table public.product_impressions enable row level security';
      execute 'drop policy if exists "Anyone can insert product impressions" on public.product_impressions';
      execute 'create policy "Anyone can insert product impressions" on public.product_impressions for insert with check (true)';
      execute 'create index if not exists product_impressions_product_created_idx on public.product_impressions (product_id, created_at desc)';
      execute 'grant insert on table public.product_impressions to anon, authenticated';
    end if;
  end if;
end $$;

