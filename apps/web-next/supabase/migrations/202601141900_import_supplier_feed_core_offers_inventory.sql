-- Phase 2: sync supplier feed RPC with offers/inventory + best-offer selection
create or replace function public.import_supplier_feed_core(
  p_supplier_id uuid,
  p_items jsonb,
  p_miss_threshold integer,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_total integer := 0;
  v_valid integer := 0;
  v_failed integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_products_updated integer := 0;
  v_missing integer := 0;
  v_disabled integer := 0;
  v_disabled_products integer := 0;
  v_offers_upserted integer := 0;
  v_inventory_upserted integer := 0;
  v_stats jsonb;
begin
  if p_supplier_id is null then
    raise exception 'supplier_id_required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_must_be_array';
  end if;
  if p_miss_threshold is null or p_miss_threshold < 1 then
    p_miss_threshold := 3;
  end if;

  -- lock per supplier to avoid concurrent imports
  perform pg_advisory_xact_lock(hashtext('supplier_feed')::int, hashtext(p_supplier_id::text)::int);

  create temp table tmp_supplier_feed_items (
    sku_id uuid,
    supplier_sku text,
    cost_cents bigint,
    currency text,
    price_cents bigint,
    stock_quantity integer,
    is_available boolean,
    inventory_status text,
    lead_time_days integer,
    is_valid boolean,
    error text
  ) on commit drop;

  insert into tmp_supplier_feed_items (
    sku_id,
    supplier_sku,
    cost_cents,
    currency,
    price_cents,
    stock_quantity,
    is_available,
    inventory_status,
    lead_time_days,
    is_valid,
    error
  )
  with raw as (
    select
      x as item,
      public.try_uuid(x->>'sku_id') as sku_id_in,
      nullif(btrim(x->>'supplier_sku'), '') as supplier_sku_in,
      public.try_bigint(x->>'cost_cents') as cost_cents,
      nullif(btrim(x->>'currency'), '') as currency_raw,
      public.try_bigint(x->>'price_cents') as price_cents,
      public.try_int(x->>'stock_quantity') as stock_quantity,
      public.try_bool(x->>'is_available') as is_available,
      nullif(btrim(x->>'inventory_status'), '') as inventory_status_raw,
      public.try_int(x->>'lead_time_days') as lead_time_days,
      case when (x ? 'sku_id') and nullif(btrim(x->>'sku_id'), '') is not null and public.try_uuid(x->>'sku_id') is null then 'invalid sku_id' end as err_sku_id,
      case when (x ? 'cost_cents') and nullif(btrim(x->>'cost_cents'), '') is not null and public.try_bigint(x->>'cost_cents') is null then 'invalid cost_cents' end as err_cost,
      case when (x ? 'price_cents') and nullif(btrim(x->>'price_cents'), '') is not null and public.try_bigint(x->>'price_cents') is null then 'invalid price_cents' end as err_price,
      case when (x ? 'stock_quantity') and nullif(btrim(x->>'stock_quantity'), '') is not null and public.try_int(x->>'stock_quantity') is null then 'invalid stock_quantity' end as err_stock,
      case when (x ? 'lead_time_days') and nullif(btrim(x->>'lead_time_days'), '') is not null and public.try_int(x->>'lead_time_days') is null then 'invalid lead_time_days' end as err_lead,
      case when (x ? 'is_available') and nullif(btrim(x->>'is_available'), '') is not null and public.try_bool(x->>'is_available') is null then 'invalid is_available' end as err_bool,
      case when (x ? 'currency') and nullif(btrim(x->>'currency'), '') is not null and length(btrim(x->>'currency')) <> 3 then 'invalid currency' end as err_currency
    from jsonb_array_elements(p_items) as x
  ),
  lookup as (
    select r.*,
      s_by_sku.supplier_sku as supplier_sku_by_sku,
      s_by_sku.sku_id as sku_id_by_sku,
      s_by_ssku.sku_id as sku_id_by_supplier_sku
    from raw r
    left join public.supplier_skus s_by_sku
      on s_by_sku.supplier_id = p_supplier_id and r.sku_id_in is not null and s_by_sku.sku_id = r.sku_id_in
    left join public.supplier_skus s_by_ssku
      on s_by_ssku.supplier_id = p_supplier_id and r.supplier_sku_in is not null and s_by_ssku.supplier_sku = r.supplier_sku_in
  ),
  norm as (
    select
      coalesce(r.sku_id_in, r.sku_id_by_supplier_sku) as sku_id,
      coalesce(r.supplier_sku_in, r.supplier_sku_by_sku) as supplier_sku,
      r.cost_cents,
      case when r.currency_raw is null then null else upper(r.currency_raw) end as currency,
      r.price_cents,
      r.stock_quantity,
      r.is_available,
      case when r.inventory_status_raw is null then null else lower(r.inventory_status_raw) end as inventory_status,
      r.lead_time_days,
      nullif(concat_ws('; ',
        r.err_sku_id,
        r.err_cost,
        r.err_price,
        r.err_stock,
        r.err_lead,
        r.err_bool,
        r.err_currency,
        case
          when r.sku_id_in is null and r.supplier_sku_in is null then 'missing sku_id or supplier_sku'
          when r.sku_id_in is null and r.supplier_sku_in is not null and r.sku_id_by_supplier_sku is null then 'supplier_sku not found'
          when r.sku_id_in is not null and r.supplier_sku_in is null and r.sku_id_by_sku is null then 'supplier_sku required for new sku_id'
          when r.supplier_sku_in is not null and r.sku_id_by_supplier_sku is not null and r.sku_id_in is not null and r.sku_id_by_supplier_sku <> r.sku_id_in then 'supplier_sku maps to different sku_id'
          when coalesce(r.sku_id_in, r.sku_id_by_supplier_sku) is null then 'sku_id unresolved'
          when coalesce(r.supplier_sku_in, r.supplier_sku_by_sku) is null then 'supplier_sku unresolved'
        end
      ), '') as error
    from lookup r
  )
  select
    n.sku_id,
    n.supplier_sku,
    n.cost_cents,
    n.currency,
    n.price_cents,
    n.stock_quantity,
    n.is_available,
    n.inventory_status,
    n.lead_time_days,
    (n.error is null) as is_valid,
    n.error
  from norm n;

  select count(*) into v_total from tmp_supplier_feed_items;
  select count(*) into v_failed from tmp_supplier_feed_items where not is_valid;
  select count(*) into v_valid from tmp_supplier_feed_items where is_valid;

  -- upsert supplier_skus
  with upserted as (
    insert into public.supplier_skus (
      supplier_id,
      sku_id,
      supplier_sku,
      cost_cents,
      currency,
      lead_time_days,
      is_available,
      inventory_status,
      stock_quantity,
      last_synced_at,
      last_seen_at,
      miss_count,
      updated_at
    )
    select
      p_supplier_id,
      t.sku_id,
      t.supplier_sku,
      t.cost_cents,
      t.currency,
      t.lead_time_days,
      t.is_available,
      t.inventory_status,
      t.stock_quantity,
      v_now,
      v_now,
      0,
      v_now
    from tmp_supplier_feed_items t
    where t.is_valid
    on conflict (supplier_id, sku_id) do update
      set supplier_sku = excluded.supplier_sku,
          cost_cents = coalesce(excluded.cost_cents, public.supplier_skus.cost_cents),
          currency = coalesce(excluded.currency, public.supplier_skus.currency),
          lead_time_days = coalesce(excluded.lead_time_days, public.supplier_skus.lead_time_days),
          is_available = coalesce(excluded.is_available, public.supplier_skus.is_available),
          inventory_status = coalesce(excluded.inventory_status, public.supplier_skus.inventory_status),
          stock_quantity = coalesce(excluded.stock_quantity, public.supplier_skus.stock_quantity),
          last_synced_at = excluded.last_synced_at,
          last_seen_at = excluded.last_seen_at,
          miss_count = 0,
          updated_at = excluded.updated_at
    returning (xmax = 0) as inserted, sku_id
  )
  select
    count(*) filter (where inserted),
    count(*) filter (where not inserted)
  into v_inserted, v_updated
  from upserted;

  -- upsert supplier inventory levels
  with inv as (
    insert into public.supplier_inventory_levels (
      supplier_id,
      sku_id,
      supplier_sku_id,
      stock_quantity,
      is_available,
      inventory_status,
      last_synced_at,
      source,
      metadata,
      created_at,
      updated_at
    )
    select
      p_supplier_id,
      t.sku_id,
      s.id,
      t.stock_quantity,
      t.is_available,
      t.inventory_status,
      v_now,
      'feed',
      jsonb_build_object('run_id', p_run_id),
      v_now,
      v_now
    from tmp_supplier_feed_items t
    left join public.supplier_skus s
      on s.supplier_id = p_supplier_id and s.sku_id = t.sku_id
    where t.is_valid
    on conflict (supplier_id, sku_id) do update
      set supplier_sku_id = excluded.supplier_sku_id,
          stock_quantity = excluded.stock_quantity,
          is_available = excluded.is_available,
          inventory_status = excluded.inventory_status,
          last_synced_at = excluded.last_synced_at,
          source = excluded.source,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
    returning 1
  )
  select count(*) into v_inventory_upserted from inv;

  -- upsert supplier offers
  with offers as (
    insert into public.supplier_offers (
      supplier_id,
      sku_id,
      supplier_sku_id,
      price_cents,
      currency,
      cost_cents,
      lead_time_days,
      min_order_qty,
      max_order_qty,
      valid_from,
      valid_to,
      status,
      metadata,
      created_at,
      updated_at
    )
    select
      p_supplier_id,
      t.sku_id,
      s.id,
      t.price_cents,
      t.currency,
      t.cost_cents,
      t.lead_time_days,
      1,
      null,
      v_now,
      null,
      'active',
      jsonb_build_object('run_id', p_run_id),
      v_now,
      v_now
    from tmp_supplier_feed_items t
    left join public.supplier_skus s
      on s.supplier_id = p_supplier_id and s.sku_id = t.sku_id
    where t.is_valid and t.price_cents is not null and t.currency is not null
    on conflict (supplier_id, sku_id) do update
      set supplier_sku_id = excluded.supplier_sku_id,
          price_cents = excluded.price_cents,
          currency = excluded.currency,
          cost_cents = excluded.cost_cents,
          lead_time_days = excluded.lead_time_days,
          valid_from = excluded.valid_from,
          valid_to = null,
          status = excluded.status,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
    returning 1
  )
  select count(*) into v_offers_upserted from offers;

  -- missing items: increment miss_count and optionally disable
  with missing as (
    select s.id, s.sku_id, s.miss_count
    from public.supplier_skus s
    where s.supplier_id = p_supplier_id
      and not exists (
        select 1 from tmp_supplier_feed_items t
        where t.is_valid and t.sku_id = s.sku_id
      )
  ),
  upd as (
    update public.supplier_skus s
    set miss_count = s.miss_count + 1,
        is_available = case when s.miss_count + 1 >= p_miss_threshold then false else s.is_available end,
        inventory_status = case when s.miss_count + 1 >= p_miss_threshold then 'out_of_stock' else s.inventory_status end,
        updated_at = v_now
    from missing m
    where s.id = m.id
    returning s.sku_id, s.miss_count + 1 as new_miss
  ),
  disabled as (
    select sku_id from upd where new_miss >= p_miss_threshold
  ),
  inv_disable as (
    insert into public.supplier_inventory_levels (
      supplier_id,
      sku_id,
      stock_quantity,
      is_available,
      inventory_status,
      last_synced_at,
      source,
      metadata,
      created_at,
      updated_at
    )
    select
      p_supplier_id,
      d.sku_id,
      0,
      false,
      'out_of_stock',
      v_now,
      'miss',
      jsonb_build_object('run_id', p_run_id),
      v_now,
      v_now
    from disabled d
    on conflict (supplier_id, sku_id) do update
      set stock_quantity = excluded.stock_quantity,
          is_available = excluded.is_available,
          inventory_status = excluded.inventory_status,
          last_synced_at = excluded.last_synced_at,
          source = excluded.source,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
    returning 1
  )
  select
    (select count(*) from upd),
    (select count(*) from upd where new_miss >= p_miss_threshold),
    (select count(*) from inv_disable)
  into v_missing, v_disabled, v_disabled_products;

  -- update ecom_products from best offer (availability then price)
  with candidate_skus as (
    select distinct sku_id from tmp_supplier_feed_items where is_valid
    union
    select sku_id from (
      select s.sku_id
      from public.supplier_skus s
      where s.supplier_id = p_supplier_id
        and s.miss_count >= p_miss_threshold
    ) d
  ),
  offers as (
    select o.sku_id, o.supplier_id, o.price_cents, o.currency
    from public.supplier_offers o
    join candidate_skus c on c.sku_id = o.sku_id
    where o.status = 'active'
      and (o.valid_to is null or o.valid_to >= v_now)
  ),
  inv as (
    select i.sku_id, i.supplier_id, i.stock_quantity, i.is_available, i.inventory_status
    from public.supplier_inventory_levels i
    join candidate_skus c on c.sku_id = i.sku_id
  ),
  ranked as (
    select
      o.sku_id,
      o.price_cents,
      o.currency,
      i.stock_quantity,
      i.is_available,
      i.inventory_status,
      case
        when coalesce(i.is_available, true) = false then 2
        when i.stock_quantity is not null and i.stock_quantity <= 0 then 2
        when coalesce(lower(i.inventory_status), '') in ('out_of_stock','unavailable','sold_out') then 2
        when i.is_available = true then 0
        when i.stock_quantity is not null and i.stock_quantity > 0 then 0
        when coalesce(lower(i.inventory_status), '') in ('in_stock','available') then 0
        else 1
      end as availability_rank,
      row_number() over (
        partition by o.sku_id
        order by
          case
            when coalesce(i.is_available, true) = false then 2
            when i.stock_quantity is not null and i.stock_quantity <= 0 then 2
            when coalesce(lower(i.inventory_status), '') in ('out_of_stock','unavailable','sold_out') then 2
            when i.is_available = true then 0
            when i.stock_quantity is not null and i.stock_quantity > 0 then 0
            when coalesce(lower(i.inventory_status), '') in ('in_stock','available') then 0
            else 1
          end asc,
          o.price_cents asc nulls last
      ) as rn
    from offers o
    left join inv i
      on i.sku_id = o.sku_id and i.supplier_id = o.supplier_id
  ),
  best as (
    select * from ranked where rn = 1
  ),
  prod_upd as (
    update public.ecom_products p
    set price_cents = best.price_cents,
        currency = best.currency,
        stock_quantity = best.stock_quantity,
        is_available = best.is_available
    from best
    where p.id = best.sku_id
    returning p.id
  )
  select count(*) into v_products_updated from prod_upd;

  v_stats := jsonb_build_object(
    'total', v_total,
    'valid', v_valid,
    'failed', v_failed,
    'inserted', v_inserted,
    'updated', v_updated,
    'products_updated', v_products_updated,
    'missed', v_missing,
    'disabled', v_disabled,
    'disabled_products', v_disabled_products,
    'offers_upserted', v_offers_upserted,
    'inventory_upserted', v_inventory_upserted
  );

  return v_stats;
end;
$function$;
