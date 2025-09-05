-- scripts/sql/task_v2_setup.sql
-- Bring DB to expected V2 shape for favorites/auth stubs and minimal grants
-- Idempotent: safe to run multiple times

set client_min_messages = notice;

-- 1) base roles (best-effort)
do $$
begin
  -- Creating roles requires CREATEROLE; ignore if not permitted
  begin execute 'create role anon nologin';          exception when duplicate_object or insufficient_privilege then null; end;
  begin execute 'create role authenticated nologin';  exception when duplicate_object or insufficient_privilege then null; end;
  begin execute 'create role service_role nologin';   exception when duplicate_object or insufficient_privilege then null; end;
end $$;

-- 2) auth schema + stubs (for local envs without Supabase)
do $$
begin
  -- Create schema only if allowed; skip on hosted envs
  begin execute 'create schema if not exists auth'; exception when insufficient_privilege then null; end;
end $$;

-- Return request JWT claims as JSON (or empty JSON on absence)
do $$
begin
  -- Only create stub if function is absent and we can write to auth schema
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'jwt'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    if has_schema_privilege('auth', 'USAGE') and has_schema_privilege('auth', 'CREATE') then
      begin
        execute $sql$
          create or replace function auth.jwt()
          returns json
          stable
          language plpgsql
          as $fn$
          begin
            begin
              return (current_setting('request.jwt.claims', true))::json;
            exception when others then
              return '{}'::json;
            end;
          end
          $fn$;
        $sql$;
      exception when insufficient_privilege then null; end;
    end if;
  end if;
end $$;

-- Extract auth subject UUID from JWT claims; fallback to all-zero UUID on invalid
do $$
begin
  -- Only create stub if function is absent and we can write to auth schema
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    if has_schema_privilege('auth', 'USAGE') and has_schema_privilege('auth', 'CREATE') then
      begin
        execute $sql$
          create or replace function auth.uid()
          returns uuid
          stable
          language plpgsql
          as $fn$
          begin
            begin
              return ((current_setting('request.jwt.claims', true))::json ->> 'sub')::uuid;
            exception when others then
              return '00000000-0000-0000-0000-000000000000'::uuid;
            end;
          end
          $fn$;
        $sql$;
      exception when insufficient_privilege then null; end;
    end if;
  end if;
end $$;

-- 3) minimal profiles table (for FK compatibility in tests)
create table if not exists public.profiles (
  id uuid primary key
);

-- Ensure test profile exists
insert into public.profiles(id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- 4) Favorites: enable RLS and policies per environment
alter table if exists public.favorites enable row level security;

do $$
declare
  has_favorites boolean;
  has_auth_schema boolean;
  has_auth_uid boolean;
  has_role_authenticated boolean;
  has_role_service boolean;
begin
  has_favorites := exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='favorites'
  );
  if not has_favorites then
    return;
  end if;

  -- drop legacy policies if any (ignore missing)
  execute 'drop policy if exists "favorites read own"    on public.favorites';
  execute 'drop policy if exists "favorites select own"  on public.favorites';
  execute 'drop policy if exists "favorites write own"   on public.favorites';
  execute 'drop policy if exists "favorites service read"  on public.favorites';
  execute 'drop policy if exists "favorites service write" on public.favorites';

  has_auth_schema := exists (select 1 from pg_namespace where nspname='auth');
  has_auth_uid := has_auth_schema and exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='auth' and p.proname='uid'
      and pg_get_function_identity_arguments(p.oid)=''
  );
  has_role_authenticated := exists (select 1 from pg_roles where rolname='authenticated');
  has_role_service := exists (select 1 from pg_roles where rolname='service_role');

  if has_auth_uid and has_role_authenticated then
    -- Per-user policies for authenticated role
    execute $sql$
      create policy "favorites select own"
        on public.favorites for select
        to authenticated
        using (user_id = auth.uid());
    $sql$;
    execute $sql$
      create policy "favorites write own"
        on public.favorites for all
        to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $sql$;
  elsif has_role_service then
    -- Service-only access when no auth functions/role
    execute $sql$
      create policy "favorites service read"
        on public.favorites for select
        to service_role
        using (true);
    $sql$;
    execute $sql$
      create policy "favorites service write"
        on public.favorites for all
        to service_role
        using (true) with check (true);
    $sql$;
  elsif has_auth_uid then
    -- Fallback: policies without explicit role (PUBLIC) but row-scoped by auth.uid
    execute $sql$
      create policy "favorites select own"
        on public.favorites for select
        using (user_id = auth.uid());
    $sql$;
    execute $sql$
      create policy "favorites write own"
        on public.favorites for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $sql$;
  else
    -- No suitable roles/functions; leave RLS enabled with no policies (deny-all)
    null;
  end if;
end $$;

-- 4b) Profiles: minimal self-scoped policies for tests
do $$
declare
  has_profiles boolean;
  has_auth_uid boolean;
  has_role_authenticated boolean;
begin
  has_profiles := exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='profiles'
  );
  if not has_profiles then return; end if;

  has_auth_uid := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='auth' and p.proname='uid'
      and pg_get_function_identity_arguments(p.oid)=''
  );
  has_role_authenticated := exists (select 1 from pg_roles where rolname='authenticated');

  -- Ensure RLS is enabled (harmless if already on)
  begin execute 'alter table public.profiles enable row level security'; exception when others then null; end;

  -- Drop any legacy policies we might recreate
  execute 'drop policy if exists "profiles insert self" on public.profiles';
  execute 'drop policy if exists "profiles select own" on public.profiles';
  execute 'drop policy if exists "profiles update own" on public.profiles';

  if has_auth_uid then
    if has_role_authenticated then
      execute $sql$
        create policy "profiles insert self"
          on public.profiles for insert
          to authenticated
          with check (id = auth.uid());
      $sql$;
      execute $sql$
        create policy "profiles select own"
          on public.profiles for select
          to authenticated
          using (id = auth.uid());
      $sql$;
      execute $sql$
        create policy "profiles update own"
          on public.profiles for update
          to authenticated
          using (id = auth.uid())
          with check (id = auth.uid());
      $sql$;
    else
      -- No role object; create PUBLIC policies restricted by predicate
      execute $sql$
        create policy "profiles insert self"
          on public.profiles for insert
          with check (id = auth.uid());
      $sql$;
      execute $sql$
        create policy "profiles select own"
          on public.profiles for select
          using (id = auth.uid());
      $sql$;
      execute $sql$
        create policy "profiles update own"
          on public.profiles for update
          using (id = auth.uid())
          with check (id = auth.uid());
      $sql$;
    end if;
  end if;
end $$;

-- 5) Privileges (reach RLS)
do $$
begin
  -- Grant USAGE on public schema to existing roles only (and ignore if not owner)
  if exists (select 1 from pg_roles where rolname='authenticated') then
    begin execute 'grant usage on schema public to authenticated'; exception when insufficient_privilege then null; end;
  end if;
  if exists (select 1 from pg_roles where rolname='service_role') then
    begin execute 'grant usage on schema public to service_role'; exception when insufficient_privilege then null; end;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='favorites') then
    if exists (select 1 from pg_roles where rolname='authenticated') then
      begin execute 'grant select, insert, update, delete on table public.favorites to authenticated'; exception when insufficient_privilege then null; end;
    end if;
    if exists (select 1 from pg_roles where rolname='service_role') then
      begin execute 'grant select, insert, update, delete on table public.favorites to service_role'; exception when insufficient_privilege then null; end;
    end if;
  end if;

  -- Minimal grants for test profiles table
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    if exists (select 1 from pg_roles where rolname='authenticated') then
      begin execute 'grant select, insert on table public.profiles to authenticated'; exception when insufficient_privilege then null; end;
    end if;
    if exists (select 1 from pg_roles where rolname='service_role') then
      begin execute 'grant select, insert on table public.profiles to service_role'; exception when insufficient_privilege then null; end;
    end if;
  end if;
end $$;

-- 6) Helpful index for favorites page
do $$ begin
  -- Only create if both columns exist
  if (
    select count(*)
    from information_schema.columns
    where table_schema='public' and table_name='favorites' and column_name in ('user_id','created_at')
  ) = 2 then
    execute 'create index if not exists idx_favorites_user_created_at on public.favorites (user_id, created_at desc)';
  end if;
end $$;

-- 7) Ensure placeholder offer for tests (unknown)
insert into public.offers (slug, name, link, enabled, methods, license)
values ('unknown','Unknown Offer','https://example.com', true, '{}'::text[], 'Other')
on conflict (slug) do nothing;
