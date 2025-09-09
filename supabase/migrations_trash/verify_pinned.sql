-- verify_pinned.sql (ASCII only)
SET client_encoding = 'UTF8';
\encoding UTF8

\echo === COUNTS BEFORE ===
select count(*) as partners_cnt from public.partners;
select count(*) as partner_offers_cnt from public.partner_offers;

\echo === SAMPLE BEFORE ===
select partner_id, offer_id, pinned
from public.partner_offers
order by partner_id, offer_id
limit 5;

select id, expires_at
from public.partners
order by expires_at desc nulls last
limit 5;

-- 1) ensure offer 'test'
insert into public.offers (slug, name, link, methods, license)
values ('test','Test Offer','https://example.com','{}','Other')
on conflict (slug) do nothing;

-- 2) ensure active partner (expires_at null or in future)
do $$
declare
  v_partner_id uuid;
begin
  select id into v_partner_id
  from public.partners
  where expires_at is null or expires_at > now()
  order by expires_at nulls first
  limit 1;

  if v_partner_id is null then
    insert into public.partners (name, email, plan, expires_at)
    values ('Demo Partner','demo@example.com','FEATURED', now() + interval '30 days')
    returning id into v_partner_id;
  end if;
end $$;

-- 3) upsert pinned relation (UUID partner_id + BIGINT offer_id)
do $$
declare
  v_partner_id uuid;
  v_offer_id   bigint;
begin
  select id into v_partner_id
  from public.partners
  where expires_at is null or expires_at > now()
  order by expires_at nulls first
  limit 1;

  select id into v_offer_id
  from public.offers
  where slug = 'test'
  limit 1;

  if v_partner_id is not null and v_offer_id is not null then
    insert into public.partner_offers (partner_id, offer_id, pinned)
    values (v_partner_id, v_offer_id, true)
    on conflict (partner_id, offer_id) do update
      set pinned = excluded.pinned;
  end if;
end $$;

-- 4) partial index for pinned
create index if not exists partner_offers_pinned_offer_id_idx
  on public.partner_offers (offer_id)
  where pinned = true;

\echo === FUNCTION OUTPUT (pinned_offer_slugs) ===
select * from public.pinned_offer_slugs();

\echo === SAMPLE AFTER ===
select partner_id, offer_id, pinned
from public.partner_offers
order by partner_id, offer_id
limit 10;

select id, slug from public.offers where slug='test' limit 1;



