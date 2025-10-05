-- Update foreign keys referencing auth.users to use public.auth_users
begin;

do $$
declare
  rec record;
  newdef text;
begin
  for rec in
    select con.oid,
           con.conname,
           conrelid::regclass as table_name,
           pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_namespace nsp on nsp.oid = con.connamespace
    where con.confrelid = 'auth.users'::regclass
      and con.contype = 'f'
  loop
    execute format('alter table %s drop constraint %I', rec.table_name, rec.conname);
    newdef := replace(rec.definition, 'AUTH.USERS', 'public.auth_users');
    newdef := replace(newdef, 'auth.users', 'public.auth_users');
    execute format('alter table %s add constraint %I %s', rec.table_name, rec.conname, newdef);
  end loop;
end $$;

commit;
