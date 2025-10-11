begin;

alter table if exists public.ecom_categories enable row level security;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ecom_categories'
      and policyname = 'public_select_ecom_categories'
  ) then
    execute 'create policy public_select_ecom_categories on public.ecom_categories for select using (true)';
  end if;
end
$policy$;

commit;

