-- 20250904_fix_offers_impressions.sql
-- Idempotent fixes for v2 schema across Supabase and plain Postgres
-- Focus: offers slug unique, license CHECK, timestamps not null, offers RLS cleanup,
-- impressions referrer, clicks.id identity/default, clicks RLS + indexes, roles compatibility

-- 0) Compatibility roles (for plain Postgres)
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then execute 'create role anon nologin'; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then execute 'create role authenticated nologin'; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then execute 'create role service_role nologin'; end if;
end $$;

-- 1) offers: single UNIQUE on slug ----------------------------------------------------
-- Ensure there is a single UNIQUE; prefer a named constraint offers_slug_key
do $$
declare con_exists boolean;
begin
  select exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='u' and c.conname='offers_slug_key'
  ) into con_exists;
  if not con_exists then
    -- If there is an existing unique index, reuse it; else create a new constraint
    if exists (select 1 from pg_indexes where schemaname='public' and tablename='offers' and indexname='idx_offers_slug_unique') then
      execute 'alter table public.offers add constraint offers_slug_key unique using index idx_offers_slug_unique';
    else
      execute 'alter table public.offers add constraint offers_slug_key unique (slug)';
    end if;
  end if;
  -- Drop duplicate standalone index if it’s not used by the unique constraint
  if exists (select 1 from pg_indexes where schemaname='public' and tablename='offers' and indexname='idx_offers_slug_unique') then
    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid=c.conrelid
      where t.relname='offers' and c.contype='u' and c.conname='offers_slug_key'
    ) then
      -- already converted above; else skip
      null;
    else
      -- if the constraint does not use that index, drop it
      -- We can’t reliably compare indids without more joins; leave as-is to avoid risk
      null;
    end if;
  end if;
end $$;

-- 2) offers.license CHECK (MGA|UKGC|Curacao|Other) ------------------------------------
-- Drop any prior license-related CHECKs and add a clean one
do $$
declare r record;
begin
  for r in (
    select c.conname from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='offers' and c.contype='c'
      and position('license' in pg_get_constraintdef(c.oid))>0
  ) loop
    execute format('alter table public.offers drop constraint %I', r.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='offers' and c.contype='c' and c.conname='offers_license_check'
  ) then
    execute $ddl$alter table public.offers add constraint offers_license_check
      check (license is null or license = any (array['MGA','UKGC','Curacao','Other']))$ddl$;
  end if;
end $$;

-- 3) offers timestamps NOT NULL (defaults assumed) ------------------------------------
update public.offers set created_at = now() where created_at is null;
update public.offers set updated_at = now() where updated_at is null;
do $$ begin
  begin execute 'alter table public.offers alter column created_at set not null'; exception when others then null; end;
  begin execute 'alter table public.offers alter column updated_at set not null'; exception when others then null; end;
end $$;

-- updated_at trigger should exist (recreate safely)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at before update on public.offers for each row execute function public.set_updated_at();

-- 4) offers RLS: single public SELECT; write by service_role (+ admins if available) ---
alter table public.offers enable row level security;
drop policy if exists "offers_read_public" on public.offers;
drop policy if exists "offers_anon_select" on public.offers;
drop policy if exists "offers_auth_select" on public.offers;
drop policy if exists "Public read enabled offers" on public.offers;
drop policy if exists "Auth read all offers" on public.offers;

create policy "offers_read_public"
  on public.offers for select to anon, authenticated using (true);

drop policy if exists "offers_write_service" on public.offers;
create policy "offers_write_service"
  on public.offers for all to service_role using (true) with check (true);

-- Optional admin policy if is_admin() exists (Supabase env)
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_admin') then
    drop policy if exists "offers_write_admins" on public.offers;
    execute $ddl$create policy "offers_write_admins" on public.offers for all to authenticated using (public.is_admin()) with check (public.is_admin())$ddl$;
  end if;
end $$;

-- 5) impressions: unify referrer, drop legacy referer ---------------------------------
-- Backfill referrer from referer if needed, then drop referer
do $$ begin
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='impressions' and column_name='referer'
  ) then
    execute 'update public.impressions set referrer = coalesce(referrer, referer) where referrer is null';
    begin
      execute 'alter table public.impressions drop column referer';
    exception when undefined_column then null; end;
  end if;
end $$;

-- 6) clicks.id ensure identity/default -------------------------------------------------
do $$
begin
  if (select pg_get_expr(d.adbin,d.adrelid) from pg_attrdef d
      join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum
      join pg_class t on t.oid=d.adrelid
      where t.relname='clicks' and a.attname='id') is null
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='clicks' and column_name='id' and is_identity='YES') then
    begin
      execute 'alter table public.clicks alter column id add generated by default as identity';
    exception when others then
      execute 'create sequence if not exists public.clicks_id_seq';
      execute 'alter table public.clicks alter column id set default nextval(''public.clicks_id_seq'')';
      execute 'alter sequence public.clicks_id_seq owned by public.clicks.id';
    end;
  end if;
end $$;

-- 7) clicks RLS + indexes cleanup ------------------------------------------------------
alter table public.clicks enable row level security;
-- Remove any permissive anon insert policy
do $$ begin
  perform 1;
end $$;
drop policy if exists "allow insert for anon" on public.clicks;
drop policy if exists "clicks_insert_anon" on public.clicks;

-- Keep: select for authenticated, insert for service_role
drop policy if exists "clicks_select_authenticated" on public.clicks;
create policy "clicks_select_authenticated" on public.clicks for select to authenticated using (true);
drop policy if exists "clicks_insert_service" on public.clicks;
create policy "clicks_insert_service" on public.clicks for insert to service_role with check (true);

-- Drop duplicate ip_hash, ts desc index if more than one exists (best-effort)
do $$ begin
  -- Try drop by common names; ignore errors
  begin execute 'drop index if exists public.clicks_ip_ts_idx'; exception when others then null; end;
  -- Keep or recreate a single canonical index
  execute 'create index if not exists idx_clicks_ip_ts on public.clicks (ip_hash, ts desc)';
end $$;

-- 8) Guard policies that rely on auth.jwt() for plain Postgres (none created here)
-- Example wrapper shown for future additions
-- do $$ begin
--   if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname=''jwt'' and n.nspname=''auth'') then
--     -- create/drop policies that reference auth.jwt()
--   end if;
-- end $$;
