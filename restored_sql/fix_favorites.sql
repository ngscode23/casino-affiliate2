alter table public.favorites enable row level security;

do ON_ERROR_STOP=1
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='favorites') then
    execute 'drop policy if exists "favorites read own"  on public.favorites';
    execute 'drop policy if exists "favorites write own" on public.favorites';
    execute 'drop policy if exists "favorites service read"  on public.favorites';
    execute 'drop policy if exists "favorites service write" on public.favorites';
  end if;

  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute $
      create policy "favorites read own"
        on public.favorites for select
        to authenticated
        using (user_id = auth.uid());
    $;

    execute $
      create policy "favorites write own"
        on public.favorites for all
        to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $;
  else
    execute $
      create policy "favorites service read"
        on public.favorites for select
        to service_role
        using (true);
    $;

    execute $
      create policy "favorites service write"
        on public.favorites for all
        to service_role
        using (true) with check (true);
    $;
  end if;
end ON_ERROR_STOP=1;
