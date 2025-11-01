-- Admin dashboard metrics aggregation RPC + supporting index.
begin;

create index if not exists orders_created_at_brin on public.orders using brin (created_at);

create or replace function public.admin_dashboard_metrics_v1(
  month_count int default 12,
  day_count int default 7
) returns jsonb
language sql
stable
as $$
with params as (
  select
    greatest(1, coalesce(month_count, 12))::int as mcount,
    greatest(1, coalesce(day_count, 7))::int as dcount
),

bounds as (
  select
    date_trunc('month', now()) - ((mcount - 1) * interval '1 month') as months_start,
    (current_date - (dcount - 1))::timestamp as days_start
  from params
),

least_bound as (
  select least(
    months_start,
    days_start,
    (current_date - interval '30 days')::timestamp,
    (current_date - interval '7 days')::timestamp
  ) as min_start
  from bounds
),

filtered as (
  select
    o.created_at,
    coalesce(o.grand_total, 0)::numeric as amount_total,
    coalesce(o.discount_total, 0)::numeric as amount_discounts,
    0::numeric as amount_tax,
    lower(o.status::text) as status,
    lower(o.payment_status::text) as payment_status
  from public.orders o
  where o.created_at >= (select min_start from least_bound)
),

normalized as (
  select *,
    case
      when payment_status in ('succeeded', 'paid', 'captured')
        or status in ('paid')
        then 'succeeded'
      when payment_status in ('pending', 'requires_action', 'authorized')
        or status in ('pending', 'processing')
        then 'processing'
      when payment_status in ('failed', 'canceled', 'refunded', 'partial_refund')
        or status in ('cancelled', 'canceled', 'failed', 'refunded')
        then 'failed'
      else coalesce(payment_status, status, 'pending')
    end as normalized_status
  from filtered
),

months as (
  select generate_series(
    date_trunc('month', now()) - ((select mcount from params) - 1) * interval '1 month',
    date_trunc('month', now()),
    interval '1 month'
  ) as bucket
),

days as (
  select generate_series(
    (current_date - ((select dcount from params) - 1))::timestamp,
    current_date::timestamp,
    interval '1 day'
  ) as bucket
),

sales_by_month as (
  select
    m.bucket,
    coalesce(round(sum(n.amount_total)
      filter (where n.normalized_status = 'succeeded' and date_trunc('month', n.created_at) = m.bucket), 0), 0) as value
  from months m
  left join normalized n on date_trunc('month', n.created_at) = m.bucket
  group by m.bucket
  order by m.bucket
),

expenses_by_month as (
  select
    m.bucket,
    coalesce(round(sum(n.amount_tax + n.amount_discounts)
      filter (where date_trunc('month', n.created_at) = m.bucket), 0), 0) as value
  from months m
  left join normalized n on date_trunc('month', n.created_at) = m.bucket
  group by m.bucket
  order by m.bucket
),

profit_by_month as (
  select
    s.bucket,
    round(coalesce(s.value, 0) - coalesce(e.value, 0), 0) as value
  from sales_by_month s
  left join expenses_by_month e using (bucket)
  order by s.bucket
),

cashflow_by_day as (
  select
    d.bucket,
    coalesce(round(sum(n.amount_total)
      filter (where n.normalized_status = 'succeeded' and n.created_at::date = d.bucket::date), 0), 0) as value
  from days d
  left join normalized n on n.created_at::date = d.bucket::date
  group by d.bucket
  order by d.bucket
),

kpi_calc as (
  select
    coalesce(round(sum(amount_total)
      filter (where normalized_status = 'succeeded' and created_at >= (current_date - interval '7 days')), 0), 0) as cash,
    coalesce(round(sum(amount_total)
      filter (where normalized_status in ('pending', 'processing') and created_at >= (current_date - interval '30 days')), 0), 0) as cashflow_forecast,
    least(
      100::numeric,
      greatest(
        0::numeric,
        round((
          (
            select coalesce(sum(amount_total), 0)
            from normalized n2
            where n2.normalized_status = 'succeeded'
              and date_trunc('month', n2.created_at) = date_trunc('month', now())
          ) / 20000.0
        ) * 100, 0)
      )
    ) as goal_pct,
    jsonb_build_object(
      'pending', coalesce(count(*)
        filter (where normalized_status = 'pending' and created_at >= (current_date - interval '30 days')), 0),
      'processing', coalesce(count(*)
        filter (where normalized_status = 'processing' and created_at >= (current_date - interval '30 days')), 0),
      'succeeded', coalesce(count(*)
        filter (where normalized_status = 'succeeded' and created_at >= (current_date - interval '30 days')), 0)
    ) as cards,
    least(
      200::numeric,
      greatest(
        0::numeric,
        case
          when (
            select coalesce(sum(amount_total), 0)
            from normalized n3
            where normalized_status = 'succeeded'
              and created_at >= (current_date - interval '14 days')
              and created_at < (current_date - interval '7 days')
          ) = 0 then 200
          else round((
            (
              select coalesce(sum(amount_total), 0)
              from normalized n4
              where normalized_status = 'succeeded'
                and created_at >= (current_date - interval '7 days')
            ) /
            nullif((
              select coalesce(sum(amount_total), 0)
              from normalized n5
              where normalized_status = 'succeeded'
                and created_at >= (current_date - interval '14 days')
                and created_at < (current_date - interval '7 days')
            ), 0)
          ) * 100, 0)
        end
      )
    ) as productivity_pct
  from normalized
),

result as (
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'cash', (select cash from kpi_calc),
      'cashflowForecast', (select cashflow_forecast from kpi_calc),
      'goalPct', (select goal_pct from kpi_calc),
      'cards', (select cards from kpi_calc),
      'productivityPct', (select productivity_pct from kpi_calc)
    ),
    'sales', (
      select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value, 0)) order by bucket)
      from sales_by_month
    ),
    'expenses', (
      select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value, 0)) order by bucket)
      from expenses_by_month
    ),
    'profit', (
      select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value, 0)) order by bucket)
      from profit_by_month
    ),
    'cashflow', (
      select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon DD'), 'value', coalesce(value, 0)) order by bucket)
      from cashflow_by_day
    ),
    'updatedAt', to_jsonb(
      (to_char(timezone('UTC', now()), 'YYYY-MM-DD') || 'T' || to_char(timezone('UTC', now()), 'HH24:MI:SS.MS') || 'Z')
    )
  ) as payload
)

select payload from result;
$$;

grant execute on function public.admin_dashboard_metrics_v1(int, int) to anon, authenticated;

commit;
