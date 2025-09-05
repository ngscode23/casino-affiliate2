-- supabase/migrations/20250907_000001_rls_and_pinned_fix.sql
-- RLS-политики и pinned_* функции под v2, без догадок про имя роли и без VOLATILE в индексах.


-----------------------------
-- 1) OFFERS: RLS и политики
-----------------------------
alter table public.offers enable row level security;

drop policy if exists offers_read_public    on public.offers;
create policy offers_read_public
  on public.offers for select
  using (true);

drop policy if exists offers_write_service  on public.offers;
create policy offers_write_service
  on public.offers for all
  to service_role
  using (true) with check (true);



----------------------------------------------
-- 2) CLICKS: только service_role вставляет
----------------------------------------------
alter table public.clicks enable row level security;

drop policy if exists "allow insert for anon" on public.clicks;

drop policy if exists clicks_select_authenticated on public.clicks;
create policy clicks_select_authenticated
  on public.clicks for select
  to authenticated
  using (true);

drop policy if exists clicks_insert_service on public.clicks;
create policy clicks_insert_service
  on public.clicks for insert
  to service_role

  with check (true);

------------------------------------------------
-- 3) IMPRESSIONS: такой же режим как у clicks
------------------------------------------------
alter table public.impressions enable row level security;

drop policy if exists impressions_select_authenticated on public.impressions;
create policy impressions_select_authenticated
  on public.impressions for select
  to authenticated
  using (true);

drop policy if exists impressions_insert_service on public.impressions;
create policy impressions_insert_service
  on public.impressions for insert
  to service_role
  with check (true);

-------------------------------------------------------
-- 4) FAVORITES: политики только если есть schema auth
-------------------------------------------------------
alter table public.favorites enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname='auth') then
    execute 'drop policy if exists "favorites read own"  on public.favorites';
    execute 'drop policy if exists "favorites write own" on public.favorites';

    execute $pol$
      create policy "favorites read own"
        on public.favorites for select
        to authenticated
        using (user_id = auth.uid());
    $pol$;

    execute $pol$
      create policy "favorites write own"
        on public.favorites for all
        to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $pol$;
  end if;
end $$;

-------------------------------------------------------------
-- 5) pinned_* функции: SECURITY DEFINER + row_security=on
--    Права: anon/authenticated + текущий пользователь.
-------------------------------------------------------------
create or replace function public.pinned_offer_slugs()
returns setof text
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  perform set_config('row_security', 'on', true);
  return query
    select o.slug
    from public.partner_offers po
    join public.partners p on p.id = po.partner_id
    join public.offers   o on o.id = po.offer_id
    where po.pinned = true
      and (p.expires_at is null or p.expires_at > now())
      and o.enabled = true;
end;
$$;

revoke all on function public.pinned_offer_slugs() from public;
grant execute on function public.pinned_offer_slugs() to anon, authenticated;
do $$ begin
  execute 'grant execute on function public.pinned_offer_slugs() to ' || current_user;
end $$;

create or replace function public.pinned_offer_meta()
returns table(offer_slug text, plan text)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  perform set_config('row_security', 'on', true);
  return query
    select o.slug, p.plan
    from public.partner_offers po
    join public.partners p on p.id = po.partner_id
    join public.offers   o on o.id = po.offer_id
    where po.pinned = true
      and (p.expires_at is null or p.expires_at > now())
      and o.enabled = true;
end;
$$;

revoke all on function public.pinned_offer_meta() from public;
grant execute on function public.pinned_offer_meta() to anon, authenticated;
do $$ begin
  execute 'grant execute on function public.pinned_offer_meta() to ' || current_user;
end $$;

------------------------------------------------------------
-- 6) Индексы под pinned/partners без VOLATILE-предиката
------------------------------------------------------------
create index if not exists partner_offers_pinned_offer_id_idx
  on public.partner_offers (offer_id) where pinned = true;

-- убираем кривой индекс с now() в предикате, если вдруг есть
drop index if exists public.partners_expires_at_active_idx;

-- обычный индекс по expires_at, планировщик и так им воспользуется
create index if not exists partners_expires_at_idx
  on public.partners(expires_at);




