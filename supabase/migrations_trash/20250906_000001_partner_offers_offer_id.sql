-- partner_offers: migrate to offer_id (v2) and clean legacy offer_slug

-- 1) добавить offer_id, если нет
alter table public.partner_offers
  add column if not exists offer_id bigint;

-- 2) бэкфилл из slug -> id, если offer_id пуст и колонка offer_slug есть
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='partner_offers' and column_name='offer_slug'
  ) then
    update public.partner_offers po
    set offer_id = o.id
    from public.offers o
    where po.offer_id is null
      and po.offer_slug is not null
      and o.slug = po.offer_slug;
  end if;
end $$;

-- 3) если все строки бэкфиллены, делаем NOT NULL
do $$
begin
  if not exists (select 1 from public.partner_offers where offer_id is null) then
    alter table public.partner_offers
      alter column offer_id set not null;
  end if;
end $$;

-- 4) FK на offers(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.partner_offers'::regclass
      and contype = 'f'
      and conname = 'partner_offers_offer_id_fkey'
  ) then
    alter table public.partner_offers
      add constraint partner_offers_offer_id_fkey
      foreign key (offer_id) references public.offers(id) on delete cascade;
  end if;
end $$;

-- 5) PK/UNIQUE: переключить с (partner_id, offer_slug) на (partner_id, offer_id)
do $$
declare pk_name text;
begin
  -- найти PK по (partner_id, offer_slug) и убрать его
  select conname into pk_name
  from pg_constraint
  where conrelid='public.partner_offers'::regclass
    and contype='p'
    and pg_get_constraintdef(oid) ilike '%partner_id, offer_slug%';
  if pk_name is not null then
    execute format('alter table public.partner_offers drop constraint %I', pk_name);
  end if;
end $$;

-- гарантировать PK по (partner_id, offer_id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.partner_offers'::regclass and contype='p'
  ) then
    alter table public.partner_offers
      add primary key (partner_id, offer_id);
  end if;
end $$;

-- 6) индексы: пины и активность — по offer_id
drop index if exists public.partner_offers_pinned_slug_idx;
create index if not exists partner_offers_pinned_offer_id_idx
  on public.partner_offers (offer_id) where pinned = true;

-- 7) убрать легаси-колонку
alter table public.partner_offers
  drop column if exists offer_slug;

-- 8) RLS: политика upsert по (partner_id, offer_id) — если нужна
-- drop policy if exists "auth manage partner_offers" on public.partner_offers;
-- create policy "auth manage partner_offers"
--   on public.partner_offers for all
--   to authenticated
--   using (true) with check (true);

