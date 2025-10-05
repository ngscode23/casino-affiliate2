-- Introspection RPCs exposed via PostgREST (REST /rest/v1/rpc/*)
-- Safe, read-only, restricted to service_role

begin;

-- Tables
create or replace function public.meta_tables(schemas text[] default '{public}')
returns table(schema text, name text)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;

-- Views
create or replace function public.meta_views(schemas text[] default '{public}')
returns table(schema text, name text)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select table_schema, table_name
  from information_schema.views
  where table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;

-- Columns
create or replace function public.meta_columns(
  schemas text[] default '{public}',
  tbl text default null
)
returns table(schema text, table_name text, column_name text, data_type text, is_nullable text, column_default text)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = any (coalesce(schemas, array['public']))
    and (tbl is null or c.table_name = tbl)
  order by 1,2,c.ordinal_position;
$$;

-- RLS policies
create or replace function public.meta_policies(schemas text[] default '{public}')
returns table(schema text, table_name text, policy text, cmd text, roles text[])
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select p.schemaname, p.tablename, p.policyname, p.cmd, p.roles
  from pg_policies p
  where p.schemaname = any (coalesce(schemas, array['public']))
  order by 1,2,3;
$$;

-- Restrict execution to service_role only
revoke all on function public.meta_tables(text[])   from public, anon, authenticated;
revoke all on function public.meta_views(text[])    from public, anon, authenticated;
revoke all on function public.meta_columns(text[], text) from public, anon, authenticated;
revoke all on function public.meta_policies(text[]) from public, anon, authenticated;

grant execute on function public.meta_tables(text[])   to service_role;
grant execute on function public.meta_views(text[])    to service_role;
grant execute on function public.meta_columns(text[], text) to service_role;
grant execute on function public.meta_policies(text[]) to service_role;

commit;

