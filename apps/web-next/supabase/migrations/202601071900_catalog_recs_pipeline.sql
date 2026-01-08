begin;

create table if not exists catalog.product_stats (
  product_id uuid primary key references catalog.products(id) on delete cascade,
  views_total bigint not null default 0,
  last_viewed_at timestamptz
);

create index if not exists idx_product_stats_views_total_desc
  on catalog.product_stats (views_total desc);

create index if not exists idx_product_stats_last_viewed_at
  on catalog.product_stats (last_viewed_at desc);

create table if not exists catalog.events (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  user_id uuid,
  event_type text not null,
  product_id uuid references catalog.products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_anon_created
  on catalog.events (anon_id, created_at desc);

create index if not exists idx_events_product_created
  on catalog.events (product_id, created_at desc);

create index if not exists idx_events_type_created
  on catalog.events (event_type, created_at desc);

create or replace view public.catalog_products_recs_v as
select
  v.*,
  coalesce(ps.views_total, 0) as views_total,
  ps.last_viewed_at
from public.catalog_products_v v
left join catalog.product_stats ps
  on ps.product_id = v.id;

alter view public.catalog_products_recs_v set (security_invoker = true);

grant select on public.catalog_products_recs_v to anon, authenticated, service_role;

create or replace function public.increment_views_total(pid uuid)
returns void
language plpgsql
security definer
set search_path = catalog, public
as $$
begin
  insert into catalog.product_stats (product_id, views_total, last_viewed_at)
  values (pid, 1, now())
  on conflict (product_id)
  do update set views_total = catalog.product_stats.views_total + 1,
                last_viewed_at = now();
end;
$$;

revoke all on function public.increment_views_total(uuid) from public, anon, authenticated;
grant execute on function public.increment_views_total(uuid) to service_role;

commit;
