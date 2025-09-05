-- supabase/seed.sql
-- Idempotent demo data for local development
-- Defaults assume local Supabase (postgres on 127.0.0.1:54322)

-- 1) Offers ---------------------------------------------------------------
with up as (
  insert into public.offers (slug, name, link, enabled, methods, license, rating, position)
  values
    ('test',        'Test Offer',        'https://example.com',               true,  array['visa','mc'], 'Other',   4.2, 10),
    ('lucky-star',  'Lucky Star Casino', 'https://example.com/lucky-star',    true,  array['visa'],       'Curacao', 4.5, 20),
    ('vegas-pro',   'Vegas Pro',         'https://example.com/vegas-pro',     true,  array['mc'],         'MGA',     4.0, 30)
  on conflict (slug) do update
    set name = excluded.name,
        link = excluded.link,
        enabled = excluded.enabled,
        methods = excluded.methods,
        license = excluded.license,
        rating = excluded.rating,
        position = excluded.position
  returning slug, id
)
select 1 where true;

-- 2) Partner and pinned placements ---------------------------------------
with ins_partner as (
  insert into public.partners (name, email, plan, expires_at)
  values ('Demo Partner','demo@example.com','FEATURED', now() + interval '30 days')
  on conflict (email, plan) do update set expires_at = excluded.expires_at
  returning id
),
sel_offers as (
  select id, slug from public.offers where slug in ('test','lucky-star','vegas-pro')
)
insert into public.partner_offers (partner_id, offer_id, pinned)
select p.id, o.id, case when o.slug in ('test','lucky-star') then true else false end
from ins_partner p cross join sel_offers o
on conflict (partner_id, offer_id) do update set pinned = excluded.pinned;

-- 3) Optional sample clicks/impressions ----------------------------------
-- Use minimal records to validate joins; safe to re-run
insert into public.clicks (offer_id, click_id, params, referrer, user_agent, ip_hash)
select o.id, concat('seed_', o.slug), '{}'::jsonb, 'https://localhost', 'seed-agent/1.0', null
from public.offers o
where o.slug in ('test','lucky-star')
on conflict do nothing;

insert into public.impressions (offer_id, referrer, user_agent, ip_hash)
select o.id, 'https://localhost', 'seed-agent/1.0', null
from public.offers o
where o.slug in ('test','lucky-star')
on conflict do nothing;

-- 4) Sanity checks --------------------------------------------------------
-- Pinned slugs
-- select * from public.pinned_offer_slugs();
-- Join aggregate
-- select o.slug, count(c.id) as clicks from public.offers o left join public.clicks c on c.offer_id=o.id group by o.slug order by 2 desc;

