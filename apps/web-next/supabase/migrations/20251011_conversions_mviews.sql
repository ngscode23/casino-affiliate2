-- Materialized views for aggregated conversions (paid orders, revenue by currency)
-- Used by admin analytics API for fast lookups with optional filters.

begin;

-- Helper CTE for reuse in both views:
--   - pulls paid orders within the rolling 180-day window
--   - extracts normalized UTM/context fields from checkout_metadata
--   - aggregates order item totals per order/slug/currency

drop materialized view if exists public.conversions_by_source_day_mv;
drop materialized view if exists public.conversions_by_slug_day_mv;

create materialized view public.conversions_by_slug_day_mv as
with normalized as (
  select
    o.id as order_id,
    date_trunc('day', o.paid_at)::date as date,
    coalesce(nullif(btrim(ep.slug), ''), '-') as slug,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'utm_source')), ''), '-') as utm_source,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'utm_campaign')), ''), '-') as utm_campaign,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'device')), ''), 'unknown') as device,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'lang')), ''), '-') as lang,
    coalesce(
      nullif(btrim((o.checkout_metadata -> 'utm' ->> 'referrer_host')), ''),
      nullif(btrim((o.checkout_metadata ->> 'referrer_host')), ''),
      '-'
    ) as referrer_host,
    coalesce(nullif(btrim(o.currency), ''), 'EUR') as currency,
    sum(coalesce(oi.total, oi.qty * oi.unit_price))::numeric(14,2) as revenue_amount
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.ecom_products ep on ep.id = oi.product_id
  where
    o.paid_at is not null
    and o.status in ('paid', 'succeeded')
    and o.paid_at >= now() - interval '180 days'
  group by
    o.id,
    date,
    slug,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    currency
),
currency_agg as (
  select
    date,
    slug,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    currency,
    sum(revenue_amount) as revenue_sum
  from normalized
  group by
    date,
    slug,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    currency
),
orders_count as (
  select
    date,
    slug,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    count(distinct order_id)::bigint as paid_orders
  from normalized
  group by
    date,
    slug,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host
)
select
  c.date,
  c.slug,
  c.utm_source,
  c.utm_campaign,
  c.device,
  c.lang,
  c.referrer_host,
  oc.paid_orders,
  jsonb_object_agg(c.currency, c.revenue_sum order by c.currency) as revenue_by_currency,
  sum(c.revenue_sum)::numeric(14,2) as revenue_total,
  case
    when oc.paid_orders > 0 then round(sum(c.revenue_sum)::numeric(14,4) / oc.paid_orders, 4)
    else null
  end as avg_order_value
from currency_agg c
join orders_count oc
  on oc.date = c.date
  and oc.slug = c.slug
  and oc.utm_source = c.utm_source
  and oc.utm_campaign = c.utm_campaign
  and oc.device = c.device
  and oc.lang = c.lang
  and oc.referrer_host = c.referrer_host
group by
  c.date,
  c.slug,
  c.utm_source,
  c.utm_campaign,
  c.device,
  c.lang,
  c.referrer_host,
  oc.paid_orders;

create index if not exists conversions_by_slug_day_mv_date_idx
  on public.conversions_by_slug_day_mv (date desc, slug, utm_source, utm_campaign);

create index if not exists conversions_by_slug_day_mv_filters_idx
  on public.conversions_by_slug_day_mv (device, lang, referrer_host);

create materialized view public.conversions_by_source_day_mv as
with normalized as (
  select
    o.id as order_id,
    date_trunc('day', o.paid_at)::date as date,
    coalesce(
      nullif(btrim((o.checkout_metadata -> 'utm' ->> 'utm_source')), ''),
      nullif(btrim((o.checkout_metadata ->> 'referrer_host')), ''),
      nullif(btrim((o.checkout_metadata -> 'utm' ->> 'referrer_host')), ''),
      '-'
    ) as source,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'utm_source')), ''), '-') as utm_source,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'utm_campaign')), ''), '-') as utm_campaign,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'device')), ''), 'unknown') as device,
    coalesce(nullif(btrim((o.checkout_metadata -> 'utm' ->> 'lang')), ''), '-') as lang,
    coalesce(
      nullif(btrim((o.checkout_metadata -> 'utm' ->> 'referrer_host')), ''),
      nullif(btrim((o.checkout_metadata ->> 'referrer_host')), ''),
      '-'
    ) as referrer_host,
    coalesce(nullif(btrim(ep.slug), ''), '-') as slug,
    coalesce(nullif(btrim(o.currency), ''), 'EUR') as currency,
    sum(coalesce(oi.total, oi.qty * oi.unit_price))::numeric(14,2) as revenue_amount
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.ecom_products ep on ep.id = oi.product_id
  where
    o.paid_at is not null
    and o.status in ('paid', 'succeeded')
    and o.paid_at >= now() - interval '180 days'
  group by
    o.id,
    date,
    source,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    slug,
    currency
),
currency_agg as (
  select
    date,
    source,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    slug,
    currency,
    sum(revenue_amount) as revenue_sum
  from normalized
  group by
    date,
    source,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    slug,
    currency
),
orders_count as (
  select
    date,
    source,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    slug,
    count(distinct order_id)::bigint as paid_orders
  from normalized
  group by
    date,
    source,
    utm_source,
    utm_campaign,
    device,
    lang,
    referrer_host,
    slug
)
select
  c.date,
  c.source,
  c.utm_source,
  c.utm_campaign,
  c.device,
  c.lang,
  c.referrer_host,
  c.slug,
  oc.paid_orders,
  jsonb_object_agg(c.currency, c.revenue_sum order by c.currency) as revenue_by_currency,
  sum(c.revenue_sum)::numeric(14,2) as revenue_total,
  case
    when oc.paid_orders > 0 then round(sum(c.revenue_sum)::numeric(14,4) / oc.paid_orders, 4)
    else null
  end as avg_order_value
from currency_agg c
join orders_count oc
  on oc.date = c.date
  and oc.source = c.source
  and oc.utm_source = c.utm_source
  and oc.utm_campaign = c.utm_campaign
  and oc.device = c.device
  and oc.lang = c.lang
  and oc.referrer_host = c.referrer_host
  and oc.slug = c.slug
group by
  c.date,
  c.source,
  c.utm_source,
  c.utm_campaign,
  c.device,
  c.lang,
  c.referrer_host,
  c.slug,
  oc.paid_orders;

create index if not exists conversions_by_source_day_mv_date_idx
  on public.conversions_by_source_day_mv (date desc, source, utm_campaign);

create index if not exists conversions_by_source_day_mv_filters_idx
  on public.conversions_by_source_day_mv (slug, device, lang, referrer_host);

create or replace function public.refresh_conversions_mviews()
returns void
language plpgsql
as $$
begin
  refresh materialized view public.conversions_by_slug_day_mv;
  refresh materialized view public.conversions_by_source_day_mv;
end;
$$;

commit;
