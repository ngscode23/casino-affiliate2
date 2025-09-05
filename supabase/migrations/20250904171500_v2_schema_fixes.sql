-- v2 schema fixes: constraints, RLS simplification, partner_offers -> offer_id, indexes
-- Idempotent and safe to re-run

-- 1) offers: license CHECK (avoid Unicode pitfalls), rating CHECK, timestamps NOT NULL, methods GIN

-- Drop any existing CHECKs on license to replace with a clean one
do $$
declare r record;
begin
  for r in (
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='offers' and c.contype='c'
      and position('license' in pg_get_constraintdef(c.oid)) > 0
  ) loop
    execute format('alter table public.offers drop constraint %I', r.conname);
  end loop;
end $$;

-- Add robust CHECK: allow both Curacao and Curaçao spellings to be safe in mixed data
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='c' and c.conname='offers_license_check'
  ) then
    execute $ddl$alter table public.offers
      add constraint offers_license_check
      check (
        license is null
        or license = any (array['MGA','UKGC','Curacao','Curaçao','Other'])
      )$ddl$;
  end if;
end $$;

-- Rating bounds
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='c' and c.conname='offers_rating_check'
  ) then
    execute $ddl$alter table public.offers
      add constraint offers_rating_check
      check (rating is null or (rating >= 0 and rating <= 5))$ddl$;
  end if;
end $$;

-- created_at/updated_at NOT NULL
update public.offers set created_at = now() where created_at is null;
update public.offers set updated_at = now() where updated_at is null;
do $$ begin
  begin execute 'alter table public.offers alter column created_at set not null'; exception when others then null; end;
  begin execute 'alter table public.offers alter column updated_at set not null'; exception when others then null; end;
end $$;

-- methods GIN index for search/filtering
create index if not exists idx_offers_methods_gin on public.offers using gin (methods);

-- Clean up duplicate UNIQUE artifacts: keep constraint offers_slug_key
do $$
declare idx_oid oid;
declare con_oid oid;
declare con_idx_oid oid;
begin
  select ci.oid into idx_oid
  from pg_class ci
  join pg_namespace n on n.oid=ci.relnamespace
  where n.nspname='public' and ci.relname='idx_offers_slug_unique';

  select c.oid, c.conindid into con_oid, con_idx_oid
  from pg_constraint c
  join pg_class t on t.oid=c.conrelid
  where t.relname='offers' and c.contype='u' and c.conname='offers_slug_key';

  if idx_oid is not null and con_oid is not null and con_idx_oid is distinct from idx_oid then
    -- Drop standalone duplicate index if it's not attached to the UNIQUE constraint
    execute 'drop index if exists public.idx_offers_slug_unique';
  end if;
end $$;

-- 2) offers RLS: keep a single public read policy, write by service_role and admins
alter table public.offers enable row level security;
drop policy if exists "Public read enabled offers" on public.offers;
drop policy if exists "Auth read all offers" on public.offers;
drop policy if exists "offers_anon_select" on public.offers;
drop policy if exists "offers_auth_select" on public.offers;
drop policy if exists "offers_read_public" on public.offers;

create policy "offers_read_public"
  on public.offers for select
  to anon, authenticated
  using (true);

-- keep service_role full write
drop policy if exists "offers_write_service" on public.offers;
create policy "offers_write_service"
  on public.offers for all
  to service_role
  using (true)
  with check (true);

-- optional: admin write via public.is_admin() if present
do $$ begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='is_admin'
  ) then
    drop policy if exists "offers_write_admins" on public.offers;
    execute $ddl$create policy "offers_write_admins"
      on public.offers for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())$ddl$;
  end if;
end $$;

-- 3) partner_offers: migrate to offer_id FK and drop offer_slug
alter table public.partner_offers add column if not exists offer_id bigint;

-- Backfill offer_id from offer_slug when present
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='partner_offers' and column_name='offer_slug'
  ) then
    update public.partner_offers p
    set offer_id = o.id
    from public.offers o
    where p.offer_id is null and o.slug = p.offer_slug;
  end if;
end $$;

-- Add FK and NOT NULL
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu using (constraint_name, constraint_schema)
    where tc.table_schema='public' and tc.table_name='partner_offers'
      and tc.constraint_type='FOREIGN KEY' and kcu.column_name='offer_id'
  ) then
    execute 'alter table public.partner_offers
             add constraint partner_offers_offer_id_fkey
             foreign key (offer_id) references public.offers(id)
             on delete cascade';
  end if;
end $$;

begin;
  alter table public.partner_offers alter column offer_id set not null;
commit;

-- Drop old FK and column offer_slug when safe
-- First, drop dependent view/functions/indexes referencing offer_slug
do $$ begin
  -- dependent view
  if exists (
    select 1 from pg_class v
    join pg_namespace n on n.oid=v.relnamespace
    where n.nspname='public' and v.relname='v_pinned_offer_slugs' and v.relkind='v'
  ) then
    execute 'drop view if exists public.v_pinned_offer_slugs';
  end if;
  -- dependent functions
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='pinned_offer_slugs'
  ) then
    execute 'drop function if exists public.pinned_offer_slugs()';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='pinned_offer_meta'
  ) then
    execute 'drop function if exists public.pinned_offer_meta()';
  end if;
  -- dependent index
  execute 'drop index if exists public.partner_offers_pinned_slug_idx';
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.table_constraints tc
    where tc.table_schema='public' and tc.table_name='partner_offers'
      and tc.constraint_type='FOREIGN KEY'
      and tc.constraint_name='partner_offers_offer_slug_fkey'
  ) then
    execute 'alter table public.partner_offers drop constraint partner_offers_offer_slug_fkey';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='partner_offers' and column_name='offer_slug'
  ) then
    execute 'alter table public.partner_offers drop column offer_slug';
  end if;
end $$;

-- Ensure PK is (partner_id, offer_id)
do $$
declare pk_name text;
declare is_on_new boolean;
begin
  select c.conname,
         (
           select count(1) = 2 and bool_and(a.attname = any (array['partner_id','offer_id']))
           from unnest(c.conkey) as k
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k
         ) as on_new
  into pk_name, is_on_new
  from pg_constraint c
  join pg_class t on t.oid=c.conrelid
  where t.relname='partner_offers' and c.contype='p';

  if pk_name is not null and (not is_on_new) then
    execute format('alter table public.partner_offers drop constraint %I', pk_name);
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='partner_offers' and c.contype='p'
      and (
        select count(1) = 2 and bool_and(a.attname = any (array['partner_id','offer_id']))
        from unnest(c.conkey) as k
        join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k
      )
  ) then
    execute 'alter table public.partner_offers add primary key (partner_id, offer_id)';
  end if;
end $$;

-- Update dependent RPCs/views to use offer_id → offers.slug
create or replace function public.pinned_offer_slugs()
returns setof text
language sql
security definer
set search_path = public
as $$
  select distinct o.slug
  from public.partner_offers po
  join public.partners p on p.id = po.partner_id
  join public.offers o on o.id = po.offer_id
  where po.pinned = true
    and (p.expires_at is null or p.expires_at > now());
$$;
grant execute on function public.pinned_offer_slugs() to anon, authenticated;

create or replace function public.pinned_offer_meta()
returns table(offer_slug text, plan text)
language sql
security definer
set search_path = public
as $$
  select distinct o.slug, p.plan
  from public.partner_offers po
  join public.partners p on p.id = po.partner_id
  join public.offers o on o.id = po.offer_id
  where po.pinned = true
    and (p.expires_at is null or p.expires_at > now());
$$;
grant execute on function public.pinned_offer_meta() to anon, authenticated;

-- View
create or replace view public.v_pinned_offer_slugs as
  select distinct o.slug as offer_slug
  from public.partner_offers po
  join public.partners p on p.id = po.partner_id
  join public.offers o on o.id = po.offer_id
  where po.pinned = true
    and (p.expires_at is null or p.expires_at > now());
