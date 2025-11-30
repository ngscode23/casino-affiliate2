-- Recommendations pipeline: user_events enrichment, co-view similarities, interest scores, RPC get_recs
set check_function_bodies = off;

-- Strengthen user_events for recs
alter table public.user_events
  add column if not exists weight numeric(6,3) not null default 1.0,
  add column if not exists price_cents integer,
  add column if not exists metadata jsonb null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_events_event_chk') then
    alter table public.user_events
      add constraint user_events_event_chk
      check (event in ('view','search','click','impression','add_to_cart','purchase'))
      not valid;
  end if;
end$$;

create index if not exists user_events_product_ts_idx on public.user_events (product_id, ts desc);
create index if not exists user_events_category_ts_idx on public.user_events (category, ts desc);
create index if not exists user_events_treatment_idx on public.user_events ((metadata->>'treatment'));

-- Co-view similarity pairs
create table if not exists public.item_item_similarities (
  product_a uuid not null,
  product_b uuid not null,
  score numeric(8,4) not null,
  co_events integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_a, product_b)
);

create index if not exists item_item_similarities_score_idx on public.item_item_similarities (score desc);

-- Per-actor interest scores (materialized for cheap reads)
create materialized view if not exists public.user_interest_scores as
select
  anon_id,
  category,
  sum(weight) as score,
  max(ts) as last_event
from public.user_events
where category is not null
  and ts > now() - interval '30 days'
group by anon_id, category;

create unique index if not exists user_interest_scores_actor_cat_idx on public.user_interest_scores (anon_id, category);
create index if not exists user_interest_scores_score_idx on public.user_interest_scores (score desc);

-- Refresh interest scores (safe to run from cron)
create or replace function public.refresh_user_interest_scores()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently public.user_interest_scores;
$$;

-- Recompute co-view similarities over a sliding window
create or replace function public.refresh_item_item_similarities(p_window_days integer default 30)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff interval := make_interval(days => p_window_days);
begin
  with filtered as (
    select anon_id, product_id, event, weight
    from public.user_events
    where product_id is not null
      and ts > now() - cutoff
      and event in ('view','click','add_to_cart','purchase','impression')
  ),
  session_events as (
    select anon_id, product_id, sum(weight) as w
    from filtered
    group by anon_id, product_id
  ),
  pair_counts as (
    select a.product_id as product_a,
           b.product_id as product_b,
           sum(least(a.w, b.w)) as co_weight,
           count(*) as co_events
    from session_events a
    join session_events b
      on a.anon_id = b.anon_id
     and a.product_id < b.product_id
    group by 1,2
  ),
  singles as (
    select product_id, sum(w) as total_w
    from session_events
    group by 1
  )
  insert into public.item_item_similarities (product_a, product_b, score, co_events, updated_at)
  select
    p.product_a,
    p.product_b,
    coalesce(p.co_weight / nullif(sqrt(sa.total_w * sb.total_w), 0), 0) as score,
    p.co_events,
    now()
  from pair_counts p
  join singles sa on sa.product_id = p.product_a
  join singles sb on sb.product_id = p.product_b
  on conflict (product_a, product_b)
  do update
  set score = excluded.score,
      co_events = excluded.co_events,
      updated_at = excluded.updated_at;
end;
$$;

-- Feature flags for recs exploration
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text null,
  rollout numeric(4,3) not null default 0,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feature_flags_enabled_idx on public.feature_flags (enabled);

insert into public.feature_flags (key, enabled, description, rollout, metadata)
values ('recs_explore', true, 'Enable bandit exploration for recommendations', 0.200, jsonb_build_object('source', '20251126_recommendations'))
on conflict (key) do update
set description = excluded.description,
    rollout = excluded.rollout,
    metadata = coalesce(public.feature_flags.metadata, excluded.metadata);

-- Metrics for recommendations pipeline
create or replace function public.recs_metrics(p_days integer default 14)
returns table (
  treatment text,
  impressions bigint,
  clicks bigint,
  add_to_cart bigint,
  purchases bigint,
  gmv_cents bigint,
  ctr numeric,
  atc_rate numeric,
  conv_rate numeric,
  revenue_per_click numeric,
  revenue_per_impression numeric
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      coalesce((metadata->>'treatment')::text, 'control') as treatment,
      event,
      coalesce(weight, 1)::numeric as weight,
      coalesce(price_cents, 0)::numeric as price_cents
    from public.user_events
    where event in ('impression','click','add_to_cart','purchase')
      and ts > now() - make_interval(days => greatest(p_days, 1))
  ),
  agg as (
    select
      treatment,
      sum(case when event = 'impression' then weight else 0 end)::bigint as impressions,
      sum(case when event = 'click' then weight else 0 end)::bigint as clicks,
      sum(case when event = 'add_to_cart' then weight else 0 end)::bigint as add_to_cart,
      sum(case when event = 'purchase' then weight else 0 end)::bigint as purchases,
      sum(case when event = 'purchase' then price_cents * weight else 0 end)::bigint as gmv_cents
    from base
    group by treatment
  )
  select
    treatment,
    impressions,
    clicks,
    add_to_cart,
    purchases,
    gmv_cents,
    case when impressions > 0 then round(clicks::numeric / impressions, 4) else 0 end as ctr,
    case when clicks > 0 then round(add_to_cart::numeric / clicks, 4) else 0 end as atc_rate,
    case when impressions > 0 then round(purchases::numeric / impressions, 4) else 0 end as conv_rate,
    case when clicks > 0 then round(gmv_cents::numeric / clicks, 2) else 0 end as revenue_per_click,
    case when impressions > 0 then round(gmv_cents::numeric / impressions, 2) else 0 end as revenue_per_impression
  from agg;
$$;

-- Main RPC: pull recs for actor (anon_id or user_id)
create or replace function public.get_recs(p_actor uuid, p_limit integer default 12)
returns table (product_id uuid, reason text, score numeric)
language sql
security definer
set search_path = public
as $$
with recent as (
  select product_id
  from public.user_events
  where anon_id = p_actor
    and product_id is not null
  order by ts desc
  limit 5
),
similar as (
  select case
           when i.product_a = r.product_id then i.product_b
           else i.product_a
         end as product_id,
         i.score,
         'similar_to_recent'::text as reason
  from public.item_item_similarities i
  join recent r
    on i.product_a = r.product_id or i.product_b = r.product_id
),
interest as (
  select category, score
  from public.user_interest_scores
  where anon_id = p_actor
  order by score desc
  limit 3
),
by_category as (
  select
    p.id as product_id,
    (0.2 + ic.score) as score,
    'top_in_category'::text as reason
  from public.ecom_products p
  join interest ic on ic.category = p.category_slug
  where p.status in ('active','published') and p.deleted_at is null
  order by ic.score desc, coalesce(p.rating, 0) desc, p.created_at desc
  limit p_limit
),
fallback as (
  select
    p.id as product_id,
    0.05 as score,
    'trending'::text as reason
  from public.ecom_products p
  where p.status in ('active','published') and p.deleted_at is null
  order by coalesce(p.rating, 0) desc, p.created_at desc
  limit 50
),
unioned as (
  select * from similar
  union all
  select * from by_category
  union all
  select * from fallback
),
dedup as (
  select
    product_id,
    max(score) as score,
    min(reason) as reason
  from unioned
  where product_id is not null
  group by product_id
)
select product_id, reason, score
from dedup
order by score desc nulls last
limit p_limit;
$$;

do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh_user_interest_scores_hourly') then
    perform cron.schedule(
      job_name   => 'refresh_user_interest_scores_hourly',
      schedule   => '5 * * * *',
      command    => $cmd$select public.refresh_user_interest_scores();$cmd$
    );
  end if;

  if not exists (select 1 from cron.job where jobname = 'refresh_item_item_similarities_daily') then
    perform cron.schedule(
      job_name   => 'refresh_item_item_similarities_daily',
      schedule   => '45 3 * * *',
      command    => $cmd$select public.refresh_item_item_similarities(30);$cmd$
    );
  end if;
end
$do$;
