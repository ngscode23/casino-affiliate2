

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "discounts";


ALTER SCHEMA "discounts" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'Expose only application tables. Django/system locked by RLS deny_all.';



CREATE TYPE "discounts"."AssignmentScope" AS ENUM (
    'BRAND',
    'CATEGORY',
    'PRODUCT',
    'VENDOR',
    'CUSTOMER_GROUP'
);


ALTER TYPE "discounts"."AssignmentScope" OWNER TO "postgres";


CREATE TYPE "discounts"."DiscountType" AS ENUM (
    'percent_off',
    'amount_off',
    'bogo',
    'tiered',
    'coupon'
);


ALTER TYPE "discounts"."DiscountType" OWNER TO "postgres";


CREATE DOMAIN "public"."currency_code" AS character(3)
	CONSTRAINT "currency_code_check" CHECK ((VALUE ~ '^[A-Z]{3}$'::"text"));


ALTER DOMAIN "public"."currency_code" OWNER TO "postgres";


CREATE DOMAIN "public"."email_citext" AS "extensions"."citext"
	CONSTRAINT "email_citext_check" CHECK ((POSITION(('@'::"text") IN (VALUE)) > 1));


ALTER DOMAIN "public"."email_citext" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded',
    'canceled',
    'failed'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'authorized',
    'captured',
    'paid',
    'canceled',
    'refunded',
    'partial_refund',
    'requires_action'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."promotion_action_kind" AS ENUM (
    'percentage_discount',
    'fixed_amount_discount',
    'buy_x_get_y',
    'free_shipping',
    'gift_product'
);


ALTER TYPE "public"."promotion_action_kind" OWNER TO "postgres";


CREATE TYPE "public"."promotion_condition_kind" AS ENUM (
    'product',
    'category',
    'collection',
    'order_total',
    'order_quantity',
    'user_segment',
    'utm',
    'schedule',
    'custom'
);


ALTER TYPE "public"."promotion_condition_kind" OWNER TO "postgres";


CREATE TYPE "public"."promotion_status" AS ENUM (
    'draft',
    'scheduled',
    'active',
    'expired',
    'archived'
);


ALTER TYPE "public"."promotion_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "discounts"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'discounts', 'pg_temp'
    AS $$
BEGIN
  NEW."updatedAt" := now();
  RETURN NEW;
END; $$;


ALTER FUNCTION "discounts"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") RETURNS TABLE("percent_off" numeric, "amount_off_cents" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'discounts', 'pg_temp'
    AS $$
  SELECT d."percentOff"::numeric, d."amountOffCts"::int
  FROM discounts."DiscountAssignment" da
  JOIN discounts."Discount" d ON d.id = da."discountId"
  WHERE (da.scope = 'PRODUCT'  AND da."refId" = p_id::text)
     OR (da.scope = 'CATEGORY' AND da."refId" = p_category)
    AND d.active = true
    AND (d."startAt" IS NULL OR d."startAt" <= now())
    AND (d."endAt"   IS NULL OR d."endAt"   >= now())
  ORDER BY d.priority DESC NULLS LAST, d."updatedAt" DESC NULLS LAST, d."createdAt" DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  -- Ensure rows exist in stock_items then update qty in one pass
  with items as (
    select oi.order_id, oi.product_id, coalesce(oi.qty, 1)::int as qty, oi.id as order_item_id
    from public.order_items oi
    where oi.order_id = p_order_id
  ), upsert as (
    insert into public.stock_items(product_id, qty_available)
    select distinct i.product_id, 0 from items i
    on conflict (product_id) do nothing
    returning product_id
  ), upd as (
    update public.stock_items s
    set qty_available = s.qty_available + (p_sign * i.qty), updated_at = now()
    from items i
    where s.product_id = i.product_id
    returning i.order_id, i.order_item_id, s.product_id, (p_sign * i.qty) as delta
  )
  insert into public.stock_movements(order_id, order_item_id, product_id, qty_delta, reason)
  select u.order_id, u.order_item_id, u.product_id, u.delta, p_reason from upd u;
$$;


ALTER FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_mk_slug"("src" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
  select trim(both '-' from lower(
    regexp_replace(unaccent(coalesce($1,'')), '[^a-zA-Z0-9]+','-','g')
  ))
$_$;


ALTER FUNCTION "public"."_mk_slug"("src" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_norm_slug"("_slug" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case when _slug is null or btrim(_slug) = '' then '-' else btrim(_slug) end;
$$;


ALTER FUNCTION "public"."_norm_slug"("_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  -- Call validation routine if present in DB
  begin
    perform public.order_validate_transition(p_from::text, p_to::text);
  exception when undefined_function then
    -- no-op if helper not installed in this project
    perform 1;
  end;
end;
$$;


ALTER FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case
    when from_status = to_status then true
    when from_status = 'pending'  and to_status in ('paid','cancelled','canceled','failed') then true
    when from_status = 'paid'     and to_status in ('refunded') then true
    else false
  end;
$$;


ALTER FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public._order_try_validate_transition(from_status, to_status) then
    raise exception 'illegal_order_transition: % -> %', from_status, to_status using errcode='P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE base_sku text := p_sku;
DECLARE resolved text;
BEGIN
  -- Prefer own image in own folder or absolute main_image_url
  SELECT CASE
           WHEN image_path IS NOT NULL AND lower(split_part(image_path,'/',1)) = lower(p_sku) THEN image_path
           WHEN main_image_url IS NOT NULL AND (left(main_image_url,4)='http' OR lower(split_part(main_image_url,'/',1)) = lower(p_sku)) THEN main_image_url
           ELSE NULL
         END
  INTO resolved
  FROM public.ecom_products
  WHERE id = p_id;

  IF resolved IS NOT NULL THEN
    RETURN resolved;
  END IF;

  -- If it's a copy, fallback to base SKU's assets (without storing it on the row)
  IF p_sku ~* '(-COPY)+$' THEN
    base_sku := regexp_replace(p_sku, '(-COPY)+$', '', 'i');
    SELECT COALESCE(image_path, main_image_url)
      INTO resolved
      FROM public.ecom_products
      WHERE lower(sku) = lower(base_sku)
      LIMIT 1;
    IF resolved IS NOT NULL THEN
      RETURN resolved;
    END IF;
  END IF;

  RETURN NULL;
END$_$;


ALTER FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."product_reviews_raw" (
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "product_reviews_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."product_reviews_raw" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews_raw" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") RETURNS "public"."product_reviews_raw"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid;
  v_row public.product_reviews;
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.product_reviews as r (product_id, user_id, rating, title, body, status)
  values (p_product_id, v_uid, p_rating, coalesce(p_title,''), coalesce(p_body,''), 'pending')
  on conflict (product_id, user_id)
  do update set rating = excluded.rating,
                title = excluded.title,
                body = excluded.body,
                status = 'pending',
                updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;


ALTER FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v jsonb;
begin
  insert into public.product_reviews_raw (product_id, user_id, rating, title, body, status, created_at, updated_at)
  values (_product_id, _user_id, _rating, _title, _body, 'pending', now(), now())
  on conflict (product_id, user_id) do update
    set rating = excluded.rating,
        title  = excluded.title,
        body   = excluded.body,
        updated_at = now()
  returning to_jsonb(product_reviews_raw.*) into v;
  return v;
end;$$;


ALTER FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer DEFAULT 12, "day_count" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
with params as (
  select
    greatest(1, coalesce(month_count,12))::int as mcount,
    greatest(1, coalesce(day_count,7))::int as dcount
),
bounds as (
  select
    date_trunc('month', now()) - ((mcount - 1) * interval '1 month') as months_start,
    (current_date - (dcount - 1))::timestamp as days_start
  from params
),
least_bound as (
  select
    least(months_start, days_start, (current_date - interval '30 days')::timestamp, (current_date - interval '7 days')::timestamp) as min_start
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
      when payment_status in ('succeeded','paid','captured') or status in ('paid') then 'succeeded'
      when payment_status in ('pending','requires_action','authorized') or status in ('pending','processing') then 'processing'
      when payment_status in ('failed','canceled','refunded','partial_refund') or status in ('cancelled','canceled','failed','refunded') then 'failed'
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
    (current_date)::timestamp,
    interval '1 day'
  ) as bucket
),
sales_by_month as (
  select m.bucket,
         coalesce(round(sum(n.amount_total) filter (where n.normalized_status='succeeded' and date_trunc('month', n.created_at)=m.bucket),0),0) as value
  from months m
  left join normalized n on date_trunc('month', n.created_at)=m.bucket
  group by m.bucket
  order by m.bucket
),
expenses_by_month as (
  select m.bucket,
         coalesce(round(sum(n.amount_tax + n.amount_discounts) filter (where date_trunc('month', n.created_at)=m.bucket),0),0) as value
  from months m
  left join normalized n on date_trunc('month', n.created_at)=m.bucket
  group by m.bucket
  order by m.bucket
),
profit_by_month as (
  select s.bucket,
         round(coalesce(s.value,0) - coalesce(e.value,0),0) as value
  from sales_by_month s
  left join expenses_by_month e using (bucket)
  order by s.bucket
),
cashflow_by_day as (
  select d.bucket,
         coalesce(round(sum(n.amount_total) filter (where n.normalized_status='succeeded' and n.created_at::date = d.bucket::date),0),0) as value
  from days d
  left join normalized n on n.created_at::date = d.bucket::date
  group by d.bucket
  order by d.bucket
),
kpi_calc as (
  select
    coalesce(round(sum(amount_total) filter (where normalized_status='succeeded' and created_at >= (current_date - interval '7 days')),0),0) as cash,
    coalesce(round(sum(amount_total) filter (where normalized_status in ('pending','processing') and created_at >= (current_date - interval '30 days')),0),0) as cashflow_forecast,
    least(100::numeric, greatest(0::numeric, round(((select coalesce(sum(amount_total),0) from normalized n2 where n2.normalized_status='succeeded' and date_trunc('month', n2.created_at)=date_trunc('month', now())) / 20000.0) * 100,0))) as goal_pct,
    jsonb_build_object(
      'pending', coalesce(count(*) filter (where normalized_status = 'pending' and created_at >= (current_date - interval '30 days')),0),
      'processing', coalesce(count(*) filter (where normalized_status = 'processing' and created_at >= (current_date - interval '30 days')),0),
      'succeeded', coalesce(count(*) filter (where normalized_status = 'succeeded' and created_at >= (current_date - interval '30 days')),0)
    ) as cards,
    least(200::numeric, greatest(0::numeric,
      case
        when (select coalesce(sum(amount_total),0) from normalized n3 where normalized_status='succeeded' and created_at >= (current_date - interval '14 days') and created_at < (current_date - interval '7 days')) = 0
        then 200
        else round(( (select coalesce(sum(amount_total),0) from normalized n4 where normalized_status='succeeded' and created_at >= (current_date - interval '7 days')) / nullif((select coalesce(sum(amount_total),0) from normalized n5 where normalized_status='succeeded' and created_at >= (current_date - interval '14 days') and created_at < (current_date - interval '7 days')),0) ) * 100,0)
      end
    )) as productivity_pct
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
    'sales', (select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value,0)) order by bucket) from sales_by_month),
    'expenses', (select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value,0)) order by bucket) from expenses_by_month),
    'profit', (select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon'), 'value', coalesce(value,0)) order by bucket) from profit_by_month),
    'cashflow', (select jsonb_agg(jsonb_build_object('label', to_char(bucket, 'Mon DD'), 'value', coalesce(value,0)) order by bucket) from cashflow_by_day),
    'updatedAt', to_jsonb((to_char(timezone('UTC', now()), 'YYYY-MM-DD') || 'T' || to_char(timezone('UTC', now()), 'HH24:MI:SS.MS') || 'Z'))
  ) as payload
)
select payload from result;
$$;


ALTER FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer, "day_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_root uuid; v_mid uuid; r record; begin
  if coalesce(length(_body),0) < 1 then raise exception 'empty_body' using errcode='P0001'; end if;
  v_root := public.ensure_review_root(_review_id);
  select product_id into r from public.product_review_messages where id=v_root;
  insert into public.product_review_messages(product_id, root_review_id, parent_id, review_raw_id, author_id, author_role, body)
  values (r.product_id, v_root, v_root, _review_id, _actor_id, 'admin', _body)
  returning id into v_mid;
  return v_mid;
end$$;


ALTER FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean DEFAULT true) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r_products       bigint;
  r_reviews        bigint;
  r_images         bigint;
  r_stats          bigint;
  r_impressions    bigint; -- тут тип может не совпасть

begin
  -- DRY RUN: считаем, но без типовых конфликтов
  select count(*) into r_products from ecom_products               where id          <> keep_id;
  select count(*) into r_reviews  from product_reviews             where product_id  <> keep_id;
  select count(*) into r_images   from ecom_product_image_versions where product_id  <> keep_id;
  select count(*) into r_stats    from product_rating_stats        where product_uid <> keep_id;

  -- impressions: если product_id другого типа (bigint), просто считаем всё
  begin
    execute format('select count(*) from public.product_impressions where product_id <> %L', keep_id::text) into r_impressions;
  exception when undefined_function or datatype_mismatch then
    select count(*) into r_impressions from public.product_impressions;
  end;

  if dry_run then
    return json_build_object(
      'dryRun', true,
      'counts', json_build_object(
        'products', r_products,
        'reviews', r_reviews,
        'images', r_images,
        'rating_stats', r_stats,
        'impressions', r_impressions
      )
    );
  end if;

  -- EXECUTE: удаляем с учетом типов
  delete from product_reviews             where product_id  <> keep_id;

  perform 1;
  begin
    if to_regclass('public.product_reviews_raw') is not null then
      execute format('delete from public.product_reviews_raw where product_id <> %L', keep_id::text);
    end if;
  exception when others then null;
  end;

  delete from ecom_product_image_versions where product_id  <> keep_id;
  delete from product_rating_stats        where product_uid <> keep_id;

  -- impressions: если сравнение упало — чистим целиком
  begin
    execute format('delete from public.product_impressions where product_id <> %L', keep_id::text);
  exception when undefined_function or datatype_mismatch then
    delete from public.product_impressions;
  end;

  delete from ecom_products               where id          <> keep_id;

  return json_build_object(
    'dryRun', false,
    'deleted', json_build_object(
      'products', r_products,
      'reviews',  r_reviews,
      'images',   r_images,
      'rating_stats', r_stats,
      'impressions',  r_impressions
    )
  );
end $$;


ALTER FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ecom_products
    SET status = p_status, status_lc = lower(p_status), updated_at = now()
  WHERE id = p_id;
END;$$;


ALTER FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_uid uuid;
begin
  if p_status not in ('pending','approved','rejected') then
    raise exception 'Bad status';
  end if;
  update public.reviews_unified
     set status = p_status
   where id = p_review_id
   returning product_uid into v_uid;

  if not found then
    raise exception 'Not found';
  end if;

  perform public.recalc_product_rating(v_uid);
end$$;


ALTER FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_upsert_product"("p" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_slug text := nullif(p->>'slug','');
  v_title text := p->>'title';
  v_short_desc text := p->>'short_desc';
  v_description text := p->>'description';
  v_price numeric := nullif(p->>'price','')::numeric;
  v_price_cents bigint := nullif(p->>'price_cents','')::bigint;
  v_currency text := p->>'currency';
  v_main_image_url text := p->>'main_image_url';
  v_image_path text := p->>'image_path';
  v_status text := p->>'status';
  v_rating numeric := nullif(p->>'rating','')::numeric;
  v_images jsonb := coalesce(p->'images', '[]'::jsonb);
  v_specs jsonb := coalesce(p->'specs', '{}'::jsonb);
  v_category_slug text := p->>'category_slug';
  v_sku text := p->>'sku';
  v_tags text[] := (select array_agg(x) from jsonb_array_elements_text(coalesce(p->'tags','[]'::jsonb)) t(x));
  v_to_delete boolean := coalesce((p->>'to_delete')::boolean, false);
  v_created_at timestamptz := nullif(p->>'created_at','')::timestamptz;
  v_ret uuid;
begin
  if v_id is null and v_slug is not null then
    select id into v_id from public.ecom_products where slug = v_slug;
  end if;
  if v_id is null then
    v_id := gen_random_uuid();
  end if;

  begin
    insert into public.ecom_products
      (id, slug, title, short_desc, description, price, price_cents, currency, main_image_url, image_path, status, rating, images, specs, category_slug, sku, tags, to_delete, created_at)
    values
      (v_id, v_slug, v_title, coalesce(v_short_desc, v_description, ''), v_description, v_price, v_price_cents, v_currency, v_main_image_url, coalesce(v_image_path, v_main_image_url), v_status, v_rating, coalesce(v_images,'[]'::jsonb), coalesce(v_specs,'{}'::jsonb), v_category_slug, upper(coalesce(v_sku, 'SKU-'||replace(v_id::text,'-',''))), coalesce(v_tags, array[]::text[]), v_to_delete, coalesce(v_created_at, now()))
    on conflict (id) do update set
      slug=excluded.slug, title=excluded.title, short_desc=excluded.short_desc, description=excluded.description,
      price=excluded.price, price_cents=excluded.price_cents, currency=excluded.currency, main_image_url=excluded.main_image_url, image_path=excluded.image_path,
      status=excluded.status, rating=excluded.rating, images=excluded.images, specs=excluded.specs, category_slug=excluded.category_slug, sku=excluded.sku,
      tags=excluded.tags, to_delete=excluded.to_delete, created_at=excluded.created_at;
    v_ret := v_id;
  exception when unique_violation then
    -- fallback: upsert by slug if id path hit unique on slug
    insert into public.ecom_products
      (id, slug, title, short_desc, description, price, price_cents, currency, main_image_url, image_path, status, rating, images, specs, category_slug, sku, tags, to_delete, created_at)
    values
      (v_id, v_slug, v_title, coalesce(v_short_desc, v_description, ''), v_description, v_price, v_price_cents, v_currency, v_main_image_url, coalesce(v_image_path, v_main_image_url), v_status, v_rating, coalesce(v_images,'[]'::jsonb), coalesce(v_specs,'{}'::jsonb), v_category_slug, upper(coalesce(v_sku, 'SKU-'||replace(v_id::text,'-',''))), coalesce(v_tags, array[]::text[]), v_to_delete, coalesce(v_created_at, now()))
    on conflict (slug) do update set
      title=excluded.title, short_desc=excluded.short_desc, description=excluded.description,
      price=excluded.price, price_cents=excluded.price_cents, currency=excluded.currency, main_image_url=excluded.main_image_url, image_path=excluded.image_path,
      status=excluded.status, rating=excluded.rating, images=excluded.images, specs=excluded.specs, category_slug=excluded.category_slug, sku=excluded.sku,
      tags=excluded.tags, to_delete=excluded.to_delete, created_at=excluded.created_at;
    select id into v_ret from public.ecom_products where slug = v_slug;
  end;

  return v_ret;
end$$;


ALTER FUNCTION "public"."admin_upsert_product"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_catalog_list"("_category" "text" DEFAULT NULL::"text", "_limit" integer DEFAULT 24, "_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "price" numeric, "rating" numeric, "thumbnail_path" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    c.id, c.slug, c.title, c.price, c.rating, c.thumbnail_path, c.created_at
  from public.catalog_mv c
  where (_category is null or c.category_slug = _category)
  order by c.created_at desc
  limit _limit offset _offset;
$$;


ALTER FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_stripe_event"("event" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  t text := event->>'type';
  obj jsonb := event#>>'{data,object}'::text[]; -- сам объект
begin
  -- payment_intent.succeeded
  if t = 'payment_intent.succeeded' then
    insert into public.orders (stripe_pi, amount_cents, currency, status)
    values (
      obj->>'id',
      coalesce((obj->>'amount')::int, 0),
      obj->>'currency',
      'paid'
    )
    on conflict (stripe_pi) do update
      set status='paid';

  -- charge.refunded
  elsif t = 'charge.refunded' then
    update public.orders
       set status='refunded'
     where stripe_charge = obj->>'id';

  -- checkout.session.completed (одноразовый или подписка)
  elsif t = 'checkout.session.completed' then
    -- тут достаёшь customer/email/metadata и связываешь с user_id по своей логике
    null;

  -- customer.subscription.updated/created/deleted
  elsif t in ('customer.subscription.created','customer.subscription.updated','customer.subscription.deleted') then
    insert into public.subscriptions (
      stripe_customer, stripe_subscription, plan, status, current_period_end
    )
    values (
      obj->>'customer',
      obj->>'id',
      coalesce(obj#>>'{items,data,0,price,product}', ''),
      obj->>'status',
      to_timestamp(coalesce((obj->>'current_period_end')::bigint,0))
    )
    on conflict (stripe_subscription) do update
      set status = excluded.status,
          current_period_end = excluded.current_period_end,
          updated_at = now();
  end if;
end
$$;


ALTER FUNCTION "public"."apply_stripe_event"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_successful_payment"("p_order" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  update public.orders o
  set payment_status = 'succeeded',
      status = case when status in ('pending','failed','canceled','cancelled') then 'paid' else status end,
      paid_at = coalesce(paid_at, now())
  where o.id = p_order
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id
        and p.status = 'succeeded'
        and upper(p.currency) = upper(o.currency)
        and (p.amount*100)::bigint = o.amount_cents
    );
$$;


ALTER FUNCTION "public"."apply_successful_payment"("p_order" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_cart uuid; v_price numeric;
begin
  if coalesce(p_qty,0) <= 0 then
    raise exception 'qty_must_be_positive';
  end if;

  v_cart := public.cart_ensure(p_user_id);

  select price into v_price from public.ecom_products where id = p_product_id;
  if v_price is null then
    raise exception 'product_price_missing';
  end if;

  insert into public.cart_items (cart_id, product_id, qty, price_at_add)
  values (v_cart, p_product_id, p_qty, v_price)
  on conflict (cart_id, product_id) do update
    set qty = public.cart_items.qty + excluded.qty,
        price_at_add = coalesce(public.cart_items.price_at_add, excluded.price_at_add);
end$$;


ALTER FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_ensure"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  select id into v_id from public.carts where user_id = p_user_id limit 1;
  if v_id is null then
    insert into public.carts(user_id) values (p_user_id) returning id into v_id;
  end if;
  return v_id;
end$$;


ALTER FUNCTION "public"."cart_ensure"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") RETURNS TABLE("items_count" integer, "subtotal" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with c as (select cart_ensure(p_user_id) as cart_id)
  select
    coalesce((select count(*) from public.cart_items ci where ci.cart_id = c.cart_id),0) as items_count,
    coalesce((select sum(ci.qty * coalesce(ci.price_at_add, ep.price, 0))
              from public.cart_items ci left join public.ecom_products ep on ep.id = ci.product_id
              where ci.cart_id = c.cart_id), 0) as subtotal
  from c;
$$;


ALTER FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_recent_views"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  delete from public.recent_views where seen_at < now() - interval '60 days';
$$;


ALTER FUNCTION "public"."cleanup_recent_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) RETURNS TABLE("date" "date", "count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select (ts at time zone 'UTC')::date as date,
         count(*)::bigint as count
  from public.clicks
  where ts >= _from and ts <= _to
  group by 1
  order by 1;
$$;


ALTER FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer DEFAULT 0, "p_is_draft" boolean DEFAULT false, "p_visible" boolean DEFAULT true, "p_published_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.page_sections(page_path, locale, block_id, sort_order, is_draft, visible, published_at, created_by, updated_by)
  VALUES (p_page_path, p_locale, p_block_id, COALESCE(p_sort_order,0), COALESCE(p_is_draft,false), COALESCE(p_visible,true), p_published_at, auth.uid(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;


ALTER FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer, "p_is_draft" boolean, "p_visible" boolean, "p_published_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text" DEFAULT 'draft'::"text", "p_slug" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.content_blocks(locale, type, status, content_json, slug, created_by, updated_by)
  VALUES (p_locale, p_type, COALESCE(p_status,'draft'), COALESCE(p_content,'{}'::jsonb), p_slug, auth.uid(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;


ALTER FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text" DEFAULT 'revalidate'::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ DECLARE v_id uuid; BEGIN INSERT INTO public.publish_jobs(target, action, payload, status) VALUES (p_target, COALESCE(p_action,'revalidate'), COALESCE(p_payload,'{}'::jsonb), 'pending') RETURNING id INTO v_id; RETURN v_id; END $$;


ALTER FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ DECLARE v_id uuid; BEGIN INSERT INTO public.content_revisions(target_table,target_id,target_key,locale,snapshot,author,message) VALUES (p_target_table,p_target_id,p_target_key,p_locale,p_snapshot,auth.uid(),p_message) RETURNING id INTO v_id; RETURN v_id; END $$;


ALTER FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (auth.role() = 'service_role')
    OR EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      WHERE lower(ae.email) = lower(COALESCE(auth.jwt()->>'email', ''))
    )
    OR EXISTS (
      SELECT 1
      FROM public.cms_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'admin'
    )
    OR lower(COALESCE(auth.jwt()->>'role', '')) = 'admin'
    OR lower(COALESCE(auth.jwt()->'app_metadata'->>'role', '')) = 'admin'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
      ) AS role(role_name)
      WHERE lower(role_name) = 'admin'
    )
  , false);
$$;


ALTER FUNCTION "public"."cms_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_is_editor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    public.cms_is_admin()
    OR lower(COALESCE(auth.jwt()->>'role', '')) IN ('admin', 'editor')
    OR lower(COALESCE(auth.jwt()->'app_metadata'->>'role', '')) IN ('admin', 'editor')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
      ) AS role(role_name)
      WHERE lower(role_name) IN ('admin', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.cms_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('admin', 'editor')
    )
  , false);
$$;


ALTER FUNCTION "public"."cms_is_editor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.content_blocks SET status='published', published_at = p_when WHERE id = p_block_id; PERFORM public.cms_enqueue_publish('tag:content'); END $$;


ALTER FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text" DEFAULT 'en'::"text", "p_when" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.navigation_links SET published=true, updated_at = p_when WHERE menu = p_menu AND locale = p_locale; PERFORM public.cms_enqueue_publish('tag:nav'); END $$;


ALTER FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.page_sections SET is_draft=false, published_at = p_when WHERE id = p_section_id; PERFORM public.cms_enqueue_publish('page:' || (SELECT page_path FROM public.page_sections WHERE id=p_section_id)); END $$;


ALTER FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.content_blocks SET status='draft', published_at = NULL WHERE id = p_block_id; PERFORM public.cms_enqueue_publish('tag:content'); END $$;


ALTER FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text" DEFAULT 'en'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.navigation_links SET published=false WHERE menu = p_menu AND locale = p_locale; PERFORM public.cms_enqueue_publish('tag:nav'); END $$;


ALTER FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN UPDATE public.page_sections SET is_draft=true, published_at = NULL WHERE id = p_section_id; PERFORM public.cms_enqueue_publish('page:' || (SELECT page_path FROM public.page_sections WHERE id=p_section_id)); END $$;


ALTER FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  INSERT INTO public.site_settings(key, locale, value_json, is_public, updated_by)
  VALUES (p_key, p_locale, COALESCE(p_value, '{}'::jsonb), COALESCE(p_is_public, true), auth.uid())
  ON CONFLICT (key, locale) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      is_public  = EXCLUDED.is_public,
      updated_at = now(),
      updated_by = auth.uid();
END$$;


ALTER FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb" DEFAULT NULL::"jsonb", "p_value_text" "text" DEFAULT NULL::"text", "p_namespace" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.translations(locale,tkey,value_json,value_text,namespace,updated_by)
  VALUES (p_locale,p_tkey,p_value_json,p_value_text,p_namespace,auth.uid())
  ON CONFLICT (locale, tkey, ns_norm) DO UPDATE
  SET value_json=excluded.value_json, value_text=excluded.value_text, namespace=excluded.namespace, updated_at=now(), updated_by=auth.uid()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;


ALTER FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "checkout_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "contact_email" "text" GENERATED ALWAYS AS (("checkout_metadata" ->> 'contact_email'::"text")) STORED,
    "metadata_b" "jsonb" GENERATED ALWAYS AS ("checkout_metadata") STORED,
    "amount_cents" bigint,
    "payment_intent_id" "text",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "applied_promotions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "coupon_codes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "chk_orders_currency_len3" CHECK (("char_length"("currency") = 3)),
    CONSTRAINT "orders_currency_check" CHECK (("char_length"("currency") = 3)),
    CONSTRAINT "orders_metadata_is_object" CHECK (("jsonb_typeof"("checkout_metadata") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."orders" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."applied_promotions" IS 'Snapshot of promotions/actions applied to the order at checkout time.';



COMMENT ON COLUMN "public"."orders"."coupon_codes" IS 'List of coupon codes captured for the order.';



CREATE OR REPLACE FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") RETURNS "public"."orders"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  o public.orders;
BEGIN
  -- 1) есть уже? вернём
  SELECT * INTO o
  FROM public.orders
  WHERE user_id = p_user_id AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    RETURN o;
  END IF;

  -- 2) нет — создадим
  INSERT INTO public.orders (
    user_id, status, subtotal, discount_total, shipping_total, grand_total, currency
  ) VALUES (
    p_user_id, 'pending', 0, 0, 0, 0, 'EUR'
  )
  RETURNING * INTO o;

  RETURN o;

EXCEPTION
  WHEN unique_violation THEN
    -- гонка: кто-то создал параллельно → просто читаем и отдаём
    SELECT * INTO o
    FROM public.orders
    WHERE user_id = p_user_id AND status = 'pending'
    LIMIT 1;
    RETURN o;
END;
$$;


ALTER FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text" DEFAULT 'EUR'::"text", "p_status" "text" DEFAULT 'draft'::"text", "p_images" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  insert into public.ecom_products (id, slug, title, price, currency, status, images, seller_id)
  select gen_random_uuid(), p_slug, p_title, p_price, p_currency, p_status, p_images, s.id
  from public.sellers s
  where s.user_id = auth.uid() and s.status = 'active'
  returning id;
$$;


ALTER FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."currency_upper"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.currency := upper(new.currency);
  return new;
end $$;


ALTER FUNCTION "public"."currency_upper"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_whoami"() RETURNS TABLE("db_role" "text", "jwt_email" "text", "is_admin_flag" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select current_user, auth.jwt()->>'email', public.is_admin();
$$;


ALTER FUNCTION "public"."debug_whoami"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ecom_product_image_versions_set_current"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.is_current then
    update public.ecom_product_image_versions
      set is_current = false
    where product_id = new.product_id
      and id <> coalesce(new.id, old.id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."ecom_product_image_versions_set_current"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ecom_products_soft_delete_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if NEW.to_delete is true and (OLD.to_delete is distinct from true) then
    NEW.deleted_at := coalesce(NEW.deleted_at, now());
  end if;
  if coalesce(NEW.to_delete,false) = false then
    NEW.deleted_at := null;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."ecom_products_soft_delete_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_exists boolean; BEGIN
  SELECT true INTO v_exists
  FROM public.ecom_wishlist
  WHERE user_id = auth.uid() AND product_id = p_product_id
  LIMIT 1;

  IF v_exists THEN
    DELETE FROM public.ecom_wishlist
    WHERE user_id = auth.uid() AND product_id = p_product_id;
    RETURN 'removed';
  ELSE
    INSERT INTO public.ecom_wishlist(user_id, product_id) VALUES (auth.uid(), p_product_id);
    RETURN 'added';
  END IF;
END$$;


ALTER FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ecomp_set_status_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.status is null then
    if coalesce(new.price,0) > 0 then
      new.status := 'active';
    else
      new.status := 'draft';
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."ecomp_set_status_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_review_root"("_review_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare r record; v_id uuid; begin
  select * into r from public.product_reviews_raw where id=_review_id;
  if not found then raise exception 'root_not_found' using errcode='P0001'; end if;
  select id into v_id from public.product_review_messages where id=_review_id and parent_id is null;
  if v_id is null then
    insert into public.product_review_messages(id, product_id, root_review_id, parent_id, review_raw_id, author_id, author_role, body, created_at, updated_at)
    values (r.id, r.product_id, r.id, null, r.id, r.user_id, 'user', r.body, coalesce(r.created_at, now()), coalesce(r.updated_at, now()))
    returning id into v_id;
  else
    -- ensure self-root consistency
    update public.product_review_messages set root_review_id = id where id=v_id and parent_id is null and root_review_id <> id;
  end if;
  return v_id;
end$$;


ALTER FUNCTION "public"."ensure_review_root"("_review_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_order_items_total_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.total := (NEW.qty::numeric * NEW.unit_price);
  RETURN NEW;
END$$;


ALTER FUNCTION "public"."fn_order_items_total_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_auth_user"() RETURNS TABLE("id" "uuid", "email" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  select u.id, u.email
  from auth.users u
  where u.id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_reviews"() RETURNS TABLE("review_id" "text", "product_id" "text", "product_slug" "text", "product_title" "text", "product_image_path" "text", "product_images" "jsonb", "rating" integer, "title" "text", "body" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  return query
  select
    concat_ws(':', r.product_id::text, r.user_id::text) as review_id,
    r.product_id::text as product_id,
    coalesce(p.slug, r.product_id::text) as product_slug,
    p.title as product_title,
    nullif(p.image_path, '') as product_image_path,
    p.images::jsonb as product_images,
    r.rating,
    r.title,
    r.body,
    r.status,
    r.created_at,
    r.updated_at
  from public.product_reviews_raw r
  left join public.ecom_products p on p.id::text = r.product_id::text
  where r.user_id = v_uid
  order by coalesce(r.updated_at, r.created_at) desc nulls last, r.created_at desc
  limit 100;
end;
$$;


ALTER FUNCTION "public"."get_my_reviews"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_seller"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "slug" "text", "display_name" "text", "status" "text", "contact_email" "text", "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select id, user_id, slug, display_name, status, contact_email, metadata, created_at, updated_at
  from public.sellers
  where user_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."get_my_seller"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_seller_orders"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("order_id" "uuid", "created_at" timestamp with time zone, "status" "text", "items_count" integer, "seller_revenue" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with me as (
    select id from public.sellers where user_id = auth.uid() and status = 'active'
  ), seller_items as (
    select oi.order_id, oi.qty, oi.total
    from public.order_items oi
    join public.ecom_products p on p.id = oi.product_id
    join me on me.id = p.seller_id
  )
  select o.id as order_id, o.created_at, o.status::text,
         coalesce(sum(si.qty)::int,0) as items_count,
         coalesce(sum(si.total),0) as seller_revenue
  from public.orders o
  join seller_items si on si.order_id = o.id
  where o.status = 'paid'
  group by o.id
  order by o.created_at desc
  limit p_limit offset p_offset
$$;


ALTER FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_seller_products"() RETURNS TABLE("product_id" "uuid", "slug" "text", "title" "text", "status" "text", "price" numeric, "currency" "text", "qty_available" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with me as (
    select id from public.sellers where user_id = auth.uid() and status = 'active'
  )
  select p.id, p.slug, p.title, p.status, p.price, p.currency,
         coalesce(si.qty_available,0) as qty_available,
         p.created_at, p.created_at as updated_at
  from public.ecom_products p
  join me on me.id = p.seller_id
  left join public.stock_items si on si.product_id = p.id
  order by p.created_at desc
$$;


ALTER FUNCTION "public"."get_my_seller_products"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_seller_sales_summary"() RETURNS TABLE("product_id" "uuid", "slug" "text", "title" "text", "units_sold" bigint, "gross_revenue" numeric, "last_order_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with me as (
    select id from public.sellers where user_id = auth.uid() and status = 'active'
  )
  select p.id as product_id, p.slug, p.title,
         coalesce(sum(oi.qty)::bigint,0) as units_sold,
         coalesce(sum(oi.total),0) as gross_revenue,
         max(o.created_at) as last_order_at
  from public.ecom_products p
  join me on me.id = p.seller_id
  left join public.order_items oi on oi.product_id = p.id
  left join public.orders o on o.id = oi.order_id and o.status = 'paid'
  group by p.id, p.slug, p.title
  order by last_order_at desc nulls last, units_sold desc
$$;


ALTER FUNCTION "public"."get_my_seller_sales_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_page"("_slug" "text") RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "price" numeric, "rating" numeric, "image_url" "text", "image_created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with p as (
    select id, slug, title, price, rating
    from public.ecom_products
    where slug = _slug
    limit 1
  )
  select p.id, p.slug, p.title, p.price, p.rating,
         l.url as image_url, l.created_at as image_created_at
  from p
  left join public.ecom_product_images_latest l on l.product_id = p.id;
$$;


ALTER FUNCTION "public"."get_product_page"("_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with src as (
    select rating
    from public.product_reviews_raw
    where product_id = p_product_id
      and status = 'approved'
  ), hist as (
    select rating, count(*)::bigint as cnt
    from src
    group by rating
  )
  select jsonb_build_object(
    'count',      (select count(*)::bigint from src),
    'avg',        (select round(avg(rating)::numeric, 2) from src),
    'histogram',  (select coalesce(jsonb_object_agg(rating::text, cnt), '{}'::jsonb) from hist)
  );
$$;


ALTER FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" "text" NOT NULL,
    "minor_unit" smallint NOT NULL,
    CONSTRAINT "currencies_minor_unit_check" CHECK ((("minor_unit" >= 0) AND ("minor_unit" <= 4)))
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecom_product_image_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" "text",
    "path" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid",
    "is_current" boolean DEFAULT false NOT NULL,
    "source_url" "text",
    "metadata" "jsonb",
    "uploaded_via" "text"
);


ALTER TABLE "public"."ecom_product_image_versions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ecom_product_images_latest" WITH ("security_invoker"='on') AS
 SELECT DISTINCT ON ("product_id") "id",
    "product_id",
    "path" AS "url",
    "metadata" AS "meta",
    "uploaded_at" AS "created_at"
   FROM "public"."ecom_product_image_versions"
  ORDER BY "product_id", "uploaded_at" DESC;


ALTER VIEW "public"."ecom_product_images_latest" OWNER TO "postgres";


COMMENT ON VIEW "public"."ecom_product_images_latest" IS 'Latest image per product, aligned to idx_ecom_img_versions_pid_uploaddesc_inc';



CREATE TABLE IF NOT EXISTS "public"."ecom_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "rating" real DEFAULT 0 NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "category_slug" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "short_desc" "text",
    "specs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "sku" "text" NOT NULL,
    "image_path" "text",
    "currency" "text" DEFAULT 'EUR'::"text",
    "seller_id" "uuid",
    "to_delete" boolean,
    "status_lc" "text" GENERATED ALWAYS AS ("lower"("status")) STORED,
    "deleted_at" timestamp with time zone,
    "description" "text",
    "main_image_url" "text",
    "price_cents" bigint,
    CONSTRAINT "chk_ecom_products_currency_len3" CHECK (("char_length"("currency") = 3)),
    CONSTRAINT "chk_ecom_products_sku_format" CHECK (("sku" ~ '^[A-Z0-9][A-Z0-9_-]*$'::"text")),
    CONSTRAINT "chk_ecom_products_status_allowed" CHECK (("status" = ANY ('{active,published,archived,draft}'::"text"[]))),
    CONSTRAINT "ecom_products_active_price_ck" CHECK ((("status" <> 'active'::"text") OR ("price" > (0)::numeric))),
    CONSTRAINT "ecom_products_currency_check" CHECK (("char_length"("currency") = 3)),
    CONSTRAINT "ecom_products_image_path_matches_sku_chk" CHECK ((("image_path" IS NULL) OR ("lower"("image_path") ~~ ("lower"("sku") || '/%'::"text"))))
);

ALTER TABLE ONLY "public"."ecom_products" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecom_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."slug",
    "p"."title",
    "p"."price",
    "p"."rating",
    "p"."images",
    "p"."category_slug",
    "p"."tags",
    "p"."short_desc",
    "p"."specs",
    "p"."created_at",
    "p"."status",
    "p"."sku",
    "p"."image_path",
    "p"."currency",
    "p"."seller_id",
    "p"."short_desc" AS "description",
    ("round"((("p"."price")::double precision * ((10)::double precision ^ (COALESCE(("c"."minor_unit")::integer, 2))::double precision))))::bigint AS "price_cents",
    "i"."url" AS "main_image_url"
   FROM (("public"."ecom_products" "p"
     LEFT JOIN "public"."currencies" "c" ON (("c"."code" = "p"."currency")))
     LEFT JOIN "public"."ecom_product_images_latest" "i" ON (("i"."product_id" = "p"."id")))
  WHERE ((COALESCE("p"."to_delete", false) = false) AND ("lower"("p"."status") = ANY (ARRAY['active'::"text", 'published'::"text"])));


ALTER VIEW "public"."products" OWNER TO "postgres";


COMMENT ON VIEW "public"."products" IS 'API view over ecom_products.';



CREATE OR REPLACE FUNCTION "public"."get_recent_products"("_limit" integer DEFAULT 10) RETURNS SETOF "public"."products"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with ident as (select auth.uid() as user_id, public.request_anon_id() as anon_id),
  rows as (
    select rv.product_id, rv.seen_at
    from public.recent_views rv, ident i
    where (i.user_id is not null and rv.user_id = i.user_id)
       or (i.user_id is null and i.anon_id is not null and rv.anon_id = i.anon_id)
    order by rv.seen_at desc
    limit _limit
  )
  select p.*
  from rows r
  join public.products p on p.id = r.product_id
  order by r.seen_at desc;
$$;


ALTER FUNCTION "public"."get_recent_products"("_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommendations_recent"("_limit" integer DEFAULT 10) RETURNS TABLE("product_id" "uuid", "score" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with ident as (select auth.uid() as user_id, public.request_anon_id() as anon_id),
  recent as (
    select rv.product_id, rv.seen_at
    from public.recent_views rv, ident i
    where (i.user_id is not null and rv.user_id = i.user_id)
       or (i.user_id is null and i.anon_id is not null and rv.anon_id = i.anon_id)
    order by rv.seen_at desc
    limit 10
  ), pairs as (select distinct product_id as seed_id from recent),
  candidates as (
    select case when mv.product_a = p.seed_id then mv.product_b else mv.product_a end as product_id,
           max(mv.score) as sim
    from pairs p
    join public.co_viewed_mv mv on mv.product_a = p.seed_id or mv.product_b = p.seed_id
    group by 1
  )
  select c.product_id, c.sim::real as score
  from candidates c
  where not exists (select 1 from recent r where r.product_id = c.product_id)
  order by score desc
  limit _limit;
$$;


ALTER FUNCTION "public"."get_recommendations_recent"("_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer DEFAULT 10) RETURNS SETOF "public"."products"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select p.*
  from public.get_recommendations_recent(_limit) r
  join public.products p on p.id = r.product_id
  order by r.score desc;
$$;


ALTER FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          now())
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_referer" "text" DEFAULT NULL::"text", "p_utm" "jsonb" DEFAULT '{}'::"jsonb", "p_product_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_id bigint;
  v_pid uuid;
begin
  -- если pid не пришёл или он фейковый, пробуем найти по slug
  if p_product_id is not null and exists(select 1 from public.ecom_products where id = p_product_id) then
    v_pid := p_product_id;
  elsif p_slug is not null then
    select id into v_pid from public.ecom_products where slug = p_slug limit 1;
    -- если не нашли, оставим NULL; трекинг не должен падать
  else
    v_pid := null;
  end if;

  insert into public.product_impressions(product_id, slug, session_id, user_id, ip, user_agent, referer, utm)
  values (v_pid, p_slug, p_session_id, p_user_id, p_ip, p_user_agent, p_referer, coalesce(p_utm, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text", "p_user_id" "uuid", "p_ip" "inet", "p_user_agent" "text", "p_referer" "text", "p_utm" "jsonb", "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT (auth.jwt() ->> 'user_role') = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb" DEFAULT '{}'::"jsonb", "p_referrer" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_slug text := _norm_slug(p_slug);
  v_product_id uuid;
  v_now timestamptz := now();
  v_session text := coalesce(p_params->>'session', p_params->>'sid', p_params->>'session_id');
  v_ip inet := nullif(p_params->>'ip','')::inet;
  v_ua text := nullif(p_params->>'user_agent','');
begin
  select p.id into v_product_id from public.ecom_products p where p.slug = v_slug limit 1;
  if v_product_id is null then
    return;
  end if;

  if exists (
    select 1 from public.shop_clicks sc
    where sc.product_id = v_product_id
      and sc.referrer is not distinct from p_referrer
      and sc.session_id is not distinct from v_session
      and sc.created_at > v_now - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.shop_clicks(product_id, referrer, session_id, ip, user_agent)
  values (v_product_id, p_referrer, v_session, v_ip, v_ua);
end;
$$;


ALTER FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb" DEFAULT '{}'::"jsonb", "p_referrer" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_session text := coalesce(p_params->>'session', p_params->>'sid', p_params->>'session_id');
  v_ip inet := nullif(p_params->>'ip','')::inet;
  v_ua text := nullif(p_params->>'user_agent','');
begin
  if exists (
    select 1 from public.shop_clicks sc
    where sc.product_id = p_product_id
      and sc.referrer is not distinct from p_referrer
      and sc.session_id is not distinct from v_session
      and sc.created_at > v_now - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.shop_clicks(product_id, referrer, session_id, ip, user_agent)
  values (p_product_id, p_referrer, v_session, v_ip, v_ua);
end;
$$;


ALTER FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text" DEFAULT NULL::"text", "user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select public.log_click(product_id, jsonb_build_object('ip', $1, 'user_agent', $4), referrer);
$_$;


ALTER FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.shop_clicks(product_id, session_id, ip, user_agent, referrer)
  SELECT p_product, p_session, p_ip, p_ua, p_ref
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.shop_clicks sc
    WHERE sc.product_id = p_product
      AND sc.session_id = p_session
      AND sc.created_at > now() - interval '10 seconds'
  );
END;
$$;


ALTER FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb" DEFAULT '{}'::"jsonb", "p_referrer" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_slug text := _norm_slug(p_slug);
  v_product_id uuid;
  v_now timestamptz := now();
  v_session text := coalesce(p_params->>'session', p_params->>'sid', p_params->>'session_id');
  v_ip inet := nullif(p_params->>'ip','')::inet;
  v_ua text := nullif(p_params->>'user_agent','');
begin
  select p.id into v_product_id from public.ecom_products p where p.slug = v_slug limit 1;
  if v_product_id is null then
    return;
  end if;

  if exists (
    select 1 from public.shop_impressions si
    where si.product_id = v_product_id
      and si.referrer is not distinct from p_referrer
      and si.session_id is not distinct from v_session
      and si.created_at > v_now - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.shop_impressions(product_id, referrer, session_id, ip, user_agent)
  values (v_product_id, p_referrer, v_session, v_ip, v_ua);
end;
$$;


ALTER FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb" DEFAULT '{}'::"jsonb", "p_referrer" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_session text := coalesce(p_params->>'session', p_params->>'sid', p_params->>'session_id');
  v_ip inet := nullif(p_params->>'ip','')::inet;
  v_ua text := nullif(p_params->>'user_agent','');
begin
  if exists (
    select 1 from public.shop_impressions si
    where si.product_id = p_product_id
      and si.referrer is not distinct from p_referrer
      and si.session_id is not distinct from v_session
      and si.created_at > v_now - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.shop_impressions(product_id, referrer, session_id, ip, user_agent)
  values (p_product_id, p_referrer, v_session, v_ip, v_ua);
end;
$$;


ALTER FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text" DEFAULT NULL::"text", "user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select public.log_impression(product_id, jsonb_build_object('ip', $1, 'user_agent', $4), referrer);
$_$;


ALTER FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.shop_impressions(product_id, session_id, ip, user_agent, referrer)
  SELECT p_product, p_session, p_ip, p_ua, p_ref
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shop_impressions si
    WHERE si.product_id = p_product
      AND si.session_id = p_session
      AND si.created_at > now() - interval '30 seconds'
  );
END;
$$;


ALTER FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text" DEFAULT NULL::"text", "user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_params jsonb;
begin
  -- собираем только то, что реально ест внутренняя функция через p_params
  v_params := jsonb_strip_nulls(
    jsonb_build_object(
      'ip', case when ip is null then null else ip::text end,
      'user_agent', user_agent
    )
  );

  -- КРИТИЧНО: именованные аргументы должны совпадать с перегрузкой (p_product_id, p_params, p_referrer)
  perform public.log_impression(
    p_product_id => product_id,
    p_params     => coalesce(v_params, '{}'::jsonb),
    p_referrer   => referrer
  );
end;
$$;


ALTER FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") IS 'External-facing impression logging contract (wraps public.log_impression)';



CREATE OR REPLACE FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean DEFAULT true) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.orders o
  SET checkout_metadata = coalesce(o.checkout_metadata, '{}'::jsonb) || jsonb_build_object('sim', p_mark),
      updated_at = now()
  WHERE o.id = ANY(p_order_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;$$;


ALTER FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if _anon_id is null or _user_id is null then
    raise exception 'anon_id and user_id are required';
  end if;

  -- Move anon rows to user
  update public.recent_views r
     set user_id = _user_id
   where r.anon_id = _anon_id
     and r.user_id is distinct from _user_id;

  -- Deduplicate for the user keeping latest seen_at
  delete from public.recent_views t
  using (
    select user_id, product_id, max(seen_at) as max_seen
    from public.recent_views
    where user_id = _user_id
    group by user_id, product_id
  ) s
  where t.user_id = s.user_id
    and t.product_id = s.product_id
    and t.seen_at < s.max_seen;

  -- Optionally clear old anon remnants
  delete from public.recent_views
   where anon_id = _anon_id
     and user_id = _user_id;
end;
$$;


ALTER FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meta_columns"("schemas" "text"[] DEFAULT '{public}'::"text"[], "tbl" "text" DEFAULT NULL::"text") RETURNS TABLE("schema" "text", "table_name" "text", "column_name" "text", "data_type" "text", "is_nullable" "text", "column_default" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = any (coalesce(schemas, array['public']))
    and (tbl is null or c.table_name = tbl)
  order by 1,2,c.ordinal_position;
$$;


ALTER FUNCTION "public"."meta_columns"("schemas" "text"[], "tbl" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meta_policies"("schemas" "text"[] DEFAULT '{public}'::"text"[]) RETURNS TABLE("schema" "text", "table_name" "text", "policy" "text", "cmd" "text", "roles" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  select p.schemaname, p.tablename, p.policyname, p.cmd, p.roles
  from pg_policies p
  where p.schemaname = any (coalesce(schemas, array['public']))
  order by 1,2,3;
$$;


ALTER FUNCTION "public"."meta_policies"("schemas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meta_tables"("schemas" "text"[] DEFAULT '{public}'::"text"[]) RETURNS TABLE("schema" "text", "name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;


ALTER FUNCTION "public"."meta_tables"("schemas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meta_views"("schemas" "text"[] DEFAULT '{public}'::"text"[]) RETURNS TABLE("schema" "text", "name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  select table_schema, table_name
  from information_schema.views
  where table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;


ALTER FUNCTION "public"."meta_views"("schemas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_allowed_status"("p_status" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ select p_status in ('pending','paid','cancelled','refunded'); $$;


ALTER FUNCTION "public"."order_allowed_status"("p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ select public.order_allowed_status(p_status::text) $$;


ALTER FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case
    when p_from is null then p_to in ('pending')
    when p_from = p_to then true
    when p_from = 'pending'   and p_to in ('paid','cancelled') then true
    when p_from = 'paid'      and p_to =  'refunded'          then true
    when p_from = 'cancelled' and p_to =  'refunded'          then true
    else false
  end;
$$;


ALTER FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ select public.order_allowed_transition(p_from::text, p_to::text) $$;


ALTER FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.order_allowed_status(p_to) then
    raise exception 'invalid_order_status: %', p_to using errcode='P0001';
  end if;
  if p_from is distinct from p_to and not public.order_allowed_transition(p_from, p_to) then
    raise exception 'illegal_order_transition: % -> %', p_from, p_to using errcode='P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ begin perform public.order_validate_transition(p_from::text, p_to::text); end $$;


ALTER FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."orders_enforce_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();    -- берём из JWT
  END IF;

  -- обычным юзерам запрещаем писать чужой user_id
  IF auth.role() <> 'service_role' AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'user_id must equal auth.uid()';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."orders_enforce_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."orders_set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  elsif auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'user_id mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."orders_set_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."orders_status_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- new orders must start as pending
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'new orders must start as pending';
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not (
      (old.status = 'pending'  and new.status in ('paid','cancelled')) or
      (old.status = 'paid'     and new.status = 'refunded') or
      -- allow cancelled -> paid only if we truly have a successful payment recorded
      (old.status = 'cancelled' and new.status = 'paid'
         and exists (select 1 from public.payments p
                     where p.order_id = new.id
                       and p.status in ('paid','succeeded')))
    ) then
      raise exception 'invalid status transition: % -> %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."orders_status_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
with params as (
  select least(200, greatest(1, coalesce(limit_count, 5)))::int as max_rows
),

pending as (
  select
    r.id as review_id,
    r.user_id as reviewer_id,
    r.product_id as product_uid,
    r.rating,
    r.title as review_title,
    r.body as review_body,
    r.status,
    r.created_at,
    r.updated_at,
    coalesce(pc.title, ep.title) as product_title,
    coalesce(pc.slug, ep.slug) as product_slug
  from public.product_reviews_raw r
  left join public.product_catalog pc on pc.product_uid = r.product_id
  left join public.ecom_products ep on ep.id = r.product_id
  where r.status = 'pending'
  order by r.created_at desc nulls last, r.id desc
  limit (select max_rows from params)
),

message_rows as (
  select
    m.review_raw_id,
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'root_review_id', m.root_review_id,
        'parent_id', m.parent_id,
        'author_id', m.author_id,
        'author_role', m.author_role,
        'body', m.body,
        'created_at', m.created_at,
        'updated_at', coalesce(m.updated_at, m.created_at)
      )
      order by m.created_at, m.id
    ) as messages
  from public.product_review_messages m
  where m.review_raw_id in (select review_id from pending where review_id is not null)
  group by m.review_raw_id
),

latest_admin as (
  select distinct on (m.review_raw_id)
    m.review_raw_id,
    m.body,
    m.author_id,
    m.created_at
  from public.product_review_messages m
  where m.review_raw_id in (select review_id from pending where review_id is not null)
    and coalesce(m.author_role, '') = 'admin'
  order by m.review_raw_id, m.created_at desc, m.id desc
),

result as (
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.review_id::text,
        'product_uid', p.product_uid,
        'reviewer_id', p.reviewer_id,
        'review_id', p.review_id,
        'source_schema', 'public',
        'source_table', 'product_reviews_raw',
        'source_pk', p.review_id::text,
        'product_title', p.product_title,
        'product_slug', p.product_slug,
        'rating', p.rating,
        'review_title', p.review_title,
        'review_body', p.review_body,
        'status', p.status,
        'created_at', p.created_at,
        'reply_body', la.body,
        'reply_author_id', la.author_id,
        'reply_created_at', la.created_at,
        'messages', coalesce(
          mr.messages,
          jsonb_build_array(
            jsonb_build_object(
              'id', 'raw:' || p.review_id::text,
              'root_review_id', 'raw:' || p.review_id::text,
              'parent_id', null,
              'author_id', p.reviewer_id,
              'author_role', 'user',
              'body', coalesce(p.review_body, ''),
              'created_at', coalesce(p.created_at, timezone('UTC', now())),
              'updated_at', coalesce(p.created_at, timezone('UTC', now()))
            )
          )
        )
      )
      order by p.created_at desc nulls last, p.review_id desc
    ), '[]'::jsonb),
    'total', (select count(*) from public.product_reviews_raw where status = 'pending')
  ) as payload
  from pending p
  left join message_rows mr on mr.review_raw_id = p.review_id
  left join latest_admin la on la.review_raw_id = p.review_id
)
select coalesce((select payload from result), jsonb_build_object('items', '[]'::jsonb, 'total', 0));
$$;


ALTER FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_id uuid; BEGIN
  RAISE NOTICE 'place_order is deprecated, use place_order_with_items';
  INSERT INTO public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  VALUES (p_user_id, 'pending', 0, 0, 0, 0, 'USD')
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;


ALTER FUNCTION "public"."place_order"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text" DEFAULT 'USD'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_currency text := upper(substr(coalesce(p_currency,'USD'),1,3));
BEGIN
  -- Validate currency against dictionary
  IF NOT EXISTS (SELECT 1 FROM public.currencies c WHERE c.code = v_currency) THEN
    RAISE EXCEPTION 'unsupported_currency: %', v_currency USING errcode = '22023';
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_order_payload' USING errcode = '22023';
  END IF;

  -- Create order
  INSERT INTO public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  VALUES (p_user_id, 'pending', 0, 0, 0, 0, v_currency)
  RETURNING id INTO v_order_id;

  -- Aggregate duplicate product lines, then insert
  WITH src AS (
    SELECT (i->>'id')::uuid AS product_id,
           GREATEST(1, COALESCE((i->>'qty')::int, 1)) AS qty
    FROM jsonb_array_elements(p_items) i
  ), agg AS (
    SELECT product_id, SUM(qty) AS qty
    FROM src GROUP BY product_id
  ), joined AS (
    SELECT a.product_id, a.qty, p.title, p.price::numeric(10,2) AS unit_price
    FROM agg a
    JOIN public.ecom_products p ON p.id = a.product_id
  )
  INSERT INTO public.order_items (order_id, product_id, title, qty, unit_price)
  SELECT v_order_id, j.product_id, COALESCE(j.title, ''), j.qty, j.unit_price
  FROM joined j;

  -- Recalculate totals (order_items.total kept in sync by trigger)
  SELECT COALESCE(SUM(oi.total), 0)::numeric(10,2) INTO v_subtotal
  FROM public.order_items oi WHERE oi.order_id = v_order_id;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      grand_total = v_subtotal
  WHERE id = v_order_id;

  IF (SELECT grand_total FROM public.orders WHERE id = v_order_id) <= 0 THEN
    DELETE FROM public.order_items WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'order_total_zero_after_insert' USING errcode = '22023';
  END IF;

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prm_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin if new.root_review_id is null then new.root_review_id := coalesce(new.id, gen_random_uuid()); if new.id is null then new.id := new.root_review_id; end if; end if; return new; end$$;


ALTER FUNCTION "public"."prm_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prm_depth_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_depth int; begin
  with recursive chain(id, depth) as (
    select coalesce(new.parent_id, new.id), 0
    union all
    select m.parent_id, c.depth+1
    from public.product_review_messages m
    join chain c on m.id=c.id
    where m.parent_id is not null
  ) select max(depth) into v_depth from chain;
  if v_depth > 3 then raise exception 'Max thread depth exceeded'; end if;
  return new; end$$;


ALTER FUNCTION "public"."prm_depth_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone DEFAULT ("now"() - '1 day'::interval), "p_dry_run" boolean DEFAULT true) RETURNS TABLE("order_id" "uuid", "removed" boolean, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN
    SELECT id
    FROM public.orders
    WHERE (status::text IN ('cancelled','canceled'))
      AND payment_status::text = 'failed'
      AND (payment_intent_id IS NULL OR length(payment_intent_id) = 0)
      AND created_at < p_cutoff
  LOOP
    IF p_dry_run THEN
      order_id := v_id; removed := false; reason := 'dry_run'; RETURN NEXT;
    ELSE
      DELETE FROM public.payment_refunds WHERE order_id = v_id;
      DELETE FROM public.order_items     WHERE order_id = v_id;
      DELETE FROM public.payments        WHERE order_id = v_id;
      DELETE FROM public.orders          WHERE id = v_id;
      order_id := v_id; removed := true; reason := 'deleted'; RETURN NEXT;
    END IF;
  END LOOP;
END;$$;


ALTER FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_old_events"("days" integer DEFAULT 90) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  cutoff timestamptz := now() - make_interval(days => days);
  c1 bigint; c2 bigint; c3 bigint;
begin
  execute 'delete from public.shop_clicks where created_at < $1' using cutoff;
  get diagnostics c1 = row_count;
  execute 'delete from public.shop_impressions where created_at < $1' using cutoff;
  get diagnostics c2 = row_count;
  execute 'delete from public.product_impressions where created_at < $1' using cutoff;
  get diagnostics c3 = row_count;
  return jsonb_build_object('cutoff', cutoff, 'deleted', jsonb_build_object('shop_clicks', c1, 'shop_impressions', c2, 'product_impressions', c3));
end;$_$;


ALTER FUNCTION "public"."purge_old_events"("days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone DEFAULT ("now"() - '14 days'::interval)) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  delete from public.processed_events
  where created_at is not null
    and created_at < cutoff_ts;
end;$$;


ALTER FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_public_data"("_dry_run" boolean DEFAULT true, "_keep" "text"[] DEFAULT ARRAY['supabase_migrations'::"text", 'schema_migrations'::"text", 'orders_archive'::"text", 'orders_archive_export'::"text", 'currencies'::"text", 'admin_emails'::"text", 'auth_roles'::"text", 'auth_users'::"text"]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  _role text := current_setting('role', true);
  _jwt  jsonb := null;
  _list text;         -- список таблиц через запятую: "public.t1, public.t2, ..."
  _cnt  int := 0;
  results jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
begin
  -- охрана: только service_role или email из whitelist
  begin
    _jwt := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    _jwt := null;
  end;
  if coalesce(_role,'') <> 'service_role'
     and not exists (select 1 from public.admin_emails a where a.email = coalesce(_jwt->>'email','')) then
    raise exception 'not allowed';
  end if;

  -- собрать список существующих таблиц к очистке
  select string_agg(format('%I.%I', schemaname, tablename), ', ' order by tablename),
         count(*)
  into _list, _cnt
  from pg_tables
  where schemaname = 'public'
    and tablename <> all(_keep)
    and tablename not like 'orders_archive%';

  if coalesce(_cnt,0) = 0 then
    return jsonb_build_object('dryRun', _dry_run, 'tablesAttempted', 0, 'tablesTruncated', 0, 'results', results, 'warnings', warnings);
  end if;

  if _dry_run then
    results := results || jsonb_build_object('action','would_truncate','tables', regexp_split_to_array(replace(_list,'public.',''), ', '));
  else
    execute format('truncate table %s restart identity cascade', _list);
    results := results || jsonb_build_object('action','truncated','tables', regexp_split_to_array(replace(_list,'public.',''), ', '));
    begin
      perform public.refresh_analytics_mviews();
      results := results || jsonb_build_object('action','refresh_analytics_mviews','status','ok');
    exception when undefined_function then
      warnings := warnings || jsonb_build_object('action','refresh_analytics_mviews','status','skipped');
    end;
  end if;

  return jsonb_build_object(
    'dryRun', _dry_run,
    'tablesAttempted', _cnt,
    'tablesTruncated', case when _dry_run then 0 else _cnt end,
    'results', results,
    'warnings', warnings
  );
end;
$$;


ALTER FUNCTION "public"."purge_public_data"("_dry_run" boolean, "_keep" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone DEFAULT ("now"() - '30 days'::interval)) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_deleted bigint;
begin
  delete from public.webhook_logs
  where created_at < coalesce(cutoff_ts, now() - interval '30 days')
  returning 1
  into v_deleted;

  return coalesce(v_deleted, 0);
end;
$$;


ALTER FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_webhooks_failed_90d"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  delete from public.stripe_webhooks_failed
  where created_utc < now() - interval '90 days';
$$;


ALTER FUNCTION "public"."purge_webhooks_failed_90d"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_shipping numeric(12,2);
begin
  select coalesce(sum(coalesce(oi.total, oi.qty * oi.unit_price)),0)::numeric(12,2)
    into v_subtotal
  from public.order_items oi
  where oi.order_id = p_order_id;

  select discount_total, shipping_total
    into v_discount, v_shipping
  from public.orders
  where id = p_order_id
  for update;

  v_discount := coalesce(v_discount,0);
  v_shipping := coalesce(v_shipping,0);

  update public.orders
     set subtotal    = v_subtotal,
         grand_total = greatest(0, v_subtotal - v_discount + v_shipping)
   where id = p_order_id;
end$$;


ALTER FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_avg numeric; v_cnt int; BEGIN
  SELECT COALESCE(AVG(rating)::numeric(10,4),0), COUNT(*)
    INTO v_avg, v_cnt
  FROM public.product_reviews_raw
  WHERE product_id = p_product_id AND status = 'approved';
  INSERT INTO public.product_rating_stats(product_uid, avg_rating, ratings_count, updated_at)
  VALUES (p_product_id, v_avg, v_cnt, now())
  ON CONFLICT (product_uid) DO UPDATE
    SET avg_rating = EXCLUDED.avg_rating,
        ratings_count = EXCLUDED.ratings_count,
        updated_at = EXCLUDED.updated_at;
END;$$;


ALTER FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_product_rating_wrap_new"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN PERFORM public.recalc_product_rating(NEW.product_id); RETURN NEW; END;$$;


ALTER FUNCTION "public"."recalc_product_rating_wrap_new"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_product_rating_wrap_old"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN PERFORM public.recalc_product_rating(OLD.product_id); RETURN OLD; END;$$;


ALTER FUNCTION "public"."recalc_product_rating_wrap_old"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := auth.uid();
  v_anon text := request_anon_id();
begin
  if v_user is null and v_anon is null then
    raise exception 'missing identity: provide anon_id claim or auth';
  end if;

  if v_user is not null then
    loop
      update public.recent_views
         set seen_at = now(), weight = coalesce(_weight,1)
       where user_id = v_user and product_id = _product_id;
      exit when found;
      begin
        insert into public.recent_views(user_id, anon_id, product_id, seen_at, weight)
             values (v_user, null, _product_id, now(), coalesce(_weight,1));
        return;
      exception when unique_violation then
        -- concurrent racer, retry
      end;
    end loop;
    return;
  end if;

  -- anon path
  loop
    update public.recent_views
       set seen_at = now(), weight = coalesce(_weight,1)
     where anon_id = v_anon and product_id = _product_id;
    exit when found;
    begin
      insert into public.recent_views(user_id, anon_id, product_id, seen_at, weight)
           values (null, v_anon, _product_id, now(), coalesce(_weight,1));
      return;
    exception when unique_violation then
      -- concurrent racer, retry
    end;
  end loop;
end;
$$;


ALTER FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_analytics_mviews"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare r record;
begin
  for r in
    select schemaname, matviewname from pg_matviews where schemaname = 'public'
  loop
    begin
      execute format('refresh materialized view %I.%I', r.schemaname, r.matviewname);
    exception when others then
      -- ignore broken/locked MVs
      null;
    end;
  end loop;
end;
$$;


ALTER FUNCTION "public"."refresh_analytics_mviews"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_co_viewed_mv"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  refresh materialized view public.co_viewed_mv;
$$;


ALTER FUNCTION "public"."refresh_co_viewed_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_conversions_mviews"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  refresh materialized view public.conversions_by_slug_day_mv;
  refresh materialized view public.conversions_by_source_day_mv;
end;
$$;


ALTER FUNCTION "public"."refresh_conversions_mviews"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_product_rating_stats"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.product_rating_stats_mv;
  -- Upsert into table for read paths that expect a table
  INSERT INTO public.product_rating_stats(product_uid, avg_rating, ratings_count, updated_at)
  SELECT m.product_uid, m.avg_rating, m.ratings_count, m.updated_at
  FROM public.product_rating_stats_mv m
  ON CONFLICT (product_uid) DO UPDATE
  SET avg_rating = EXCLUDED.avg_rating,
      ratings_count = EXCLUDED.ratings_count,
      updated_at = EXCLUDED.updated_at;
END;$$;


ALTER FUNCTION "public"."refresh_product_rating_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.product_rating_stats (product_uid, avg_rating, ratings_count, updated_at)
  select
    p_product_id,
    coalesce(avg(rating)::numeric, 0),
    count(*),
    now()
  from public.product_reviews_raw
  where product_id = p_product_id and status = 'approved'
  on conflict (product_uid) do update
    set avg_rating = excluded.avg_rating,
        ratings_count = excluded.ratings_count,
        updated_at = excluded.updated_at;
end;
$$;


ALTER FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_stripe_products_cache"() RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  insert into public.stripe_products_cache as t
  (id, name, active, default_price, description, created, updated, attrs)
  select id, name, active, default_price, description, created, updated, attrs
  from stripe.products
  on conflict (id) do update
  set name=excluded.name,
      active=excluded.active,
      default_price=excluded.default_price,
      description=excluded.description,
      created=excluded.created,
      updated=excluded.updated,
      attrs=excluded.attrs,
      updated_at=now();
$$;


ALTER FUNCTION "public"."refresh_stripe_products_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_old_status text;
  v_updated int;
begin
  insert into public.payment_refunds(order_id, payment_intent_id, refund_id, amount_cents, currency, reason)
  select o.id, coalesce(nullif(trim(o.payment_intent_id), ''), 'unknown'), p_refund_id, p_amount_cents, p_currency, p_reason
  from public.orders o
  where o.id = p_order_id
  on conflict (refund_id) do nothing;

  select status::text into v_old_status from public.orders where id = p_order_id;

  update public.orders
  set status = 'refunded', refunded_at = now()
  where id = p_order_id and lower(coalesce(status::text, '')) in ('paid','fulfilled')
  returning 1 into v_updated;

  if coalesce(v_updated, 0) = 0 then
    if exists(select 1 from public.orders where id = p_order_id and lower(coalesce(status::text, '')) = 'refunded') then
      return true;
    end if;
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_bad_titles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  bad text;
begin
  select pattern into bad
  from public.title_blacklist
  where NEW.title ~* pattern
  limit 1;

  if bad is not null then
    raise exception 'Title violates blacklist pattern: %', bad;
  end if;

  return NEW;
end$$;


ALTER FUNCTION "public"."reject_bad_titles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_anon_id"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'anon_id'), null);
$$;


ALTER FUNCTION "public"."request_anon_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reviews_unified_instead"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op='UPDATE' then
    update public.product_reviews_raw
    set title   = coalesce(new.review_title, title),
        body    = coalesce(new.review_body, body),
        rating  = coalesce(new.rating, rating),
        status  = coalesce(new.status, status)
    where id = old.review_id;
    return new;
  elsif tg_op='INSERT' then
    insert into public.product_reviews_raw(id, user_id, product_id, title, body, rating, status, created_at)
    values (new.review_id, new.reviewer_id, new.product_uid, new.review_title, new.review_body, new.rating, coalesce(new.status,'pending'), now())
    on conflict (id) do nothing;
    return new;
  elsif tg_op='DELETE' then
    delete from public.product_reviews_raw where id=old.review_id;
    return old;
  end if;
  return null;
end$$;


ALTER FUNCTION "public"."reviews_unified_instead"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products"("_q" "text" DEFAULT NULL::"text", "_category" "text" DEFAULT NULL::"text", "_limit" integer DEFAULT 20, "_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "short_desc" "text", "description" "text", "main_image_url" "text", "price" numeric, "currency" "text", "rating" real, "category_slug" "text", "rank" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with base as (
    select
      p.id, p.slug, p.title, p.short_desc, p.description, p.main_image_url,
      p.price, p.currency, p.rating, p.category_slug,
      to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.short_desc,'') || ' ' || coalesce(p.description,'')) as sv
    from public.products p
    where (_category is null or p.category_slug = _category)
  ), q as (select case when coalesce(_q,'') = '' then to_tsquery('simple','') else websearch_to_tsquery('simple', _q) end as tsq)
  select b.id, b.slug, b.title, b.short_desc, b.description, b.main_image_url, b.price, b.currency, b.rating, b.category_slug,
         nullif(ts_rank_cd(b.sv, q.tsq),0) as rank
  from base b, q
  where (_q is null or _q = '' or q.tsq @@ b.sv)
  order by rank desc nulls last, rating desc nulls last, title asc
  limit _limit offset _offset;
$$;


ALTER FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products_unified" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."slug",
    "p"."title",
    "p"."status",
    ("p"."price")::numeric AS "price_amount",
    'USD'::"text" AS "currency",
    ("round"(("p"."price" * (100)::numeric)))::integer AS "price_cents",
    'ecom'::"text" AS "source"
   FROM "public"."ecom_products" "p"
  WHERE ("p"."status" = ANY (ARRAY['active'::"text", 'published'::"text"]))
UNION ALL
 SELECT "pr"."id",
    "pr"."slug",
    "pr"."title",
    "pr"."status",
    (("pr"."price_cents")::numeric / 100.0) AS "price_amount",
    "pr"."currency",
    "pr"."price_cents",
    'products'::"text" AS "source"
   FROM "trash"."products_legacy_20251022" "pr"
  WHERE ("pr"."status" = 'active'::"text");


ALTER VIEW "public"."products_unified" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products"("q" "text" DEFAULT NULL::"text", "sort_by" "text" DEFAULT 'relevance'::"text", "sort_dir" "text" DEFAULT 'desc'::"text", "min_price" numeric DEFAULT NULL::numeric, "max_price" numeric DEFAULT NULL::numeric, "statuses" "text"[] DEFAULT ARRAY['active'::"text"], "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS SETOF "public"."products_unified"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_sort text := coalesce(lower(sort_by), 'relevance');
  v_dir  text := case when lower(sort_dir) in ('asc','desc') then lower(sort_dir) else 'desc' end;
begin
  return query
  with base as (
    select pu.id, pu.slug, pu.title, pu.status, pu.price_amount, pu.currency, pu.price_cents, pu.source,
      case when q is null or length(trim(q)) = 0 then 0
           else (case when pu.title ilike '%'||q||'%' then 2 else 0 end) + (case when pu.slug ilike '%'||q||'%' then 1 else 0 end)
      end as relevance_score
    from public.products_unified_dedup pu  -- используем dedup-вью внутри
    where (statuses is null or pu.status = any(statuses))
      and (min_price is null or pu.price_amount >= min_price)
      and (max_price is null or pu.price_amount <= max_price)
      and (q is null or q = '' or (pu.title ilike '%'||q||'%' or pu.slug ilike '%'||q||'%'))
  )
  select b.id, b.slug, b.title, b.status, b.price_amount, b.currency, b.price_cents, b.source
  from base b
  order by
    case when v_sort = 'relevance' then b.relevance_score end desc nulls last,
    case when v_sort = 'price' and v_dir = 'asc'  then b.price_amount end asc  nulls last,
    case when v_sort = 'price' and v_dir = 'desc' then b.price_amount end desc nulls last,
    case when v_sort = 'title' and v_dir = 'asc'  then b.title end asc  nulls last,
    case when v_sort = 'title' and v_dir = 'desc' then b.title end desc nulls last,
    b.relevance_score desc, b.title asc
  limit greatest(limit_count, 0)
  offset greatest(offset_count, 0);
end;
$$;


ALTER FUNCTION "public"."search_products"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products_v2"("q" "text" DEFAULT NULL::"text", "sort_by" "text" DEFAULT 'relevance'::"text", "sort_dir" "text" DEFAULT 'desc'::"text", "min_price" numeric DEFAULT NULL::numeric, "max_price" numeric DEFAULT NULL::numeric, "statuses" "text"[] DEFAULT ARRAY['active'::"text"], "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0, "category_slugs" "text"[] DEFAULT NULL::"text"[], "skus" "text"[] DEFAULT NULL::"text"[], "sources" "text"[] DEFAULT NULL::"text"[], "min_rating" real DEFAULT NULL::real) RETURNS SETOF "public"."products_unified"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_sort text := coalesce(lower(sort_by), 'relevance');
  v_dir  text := case when lower(sort_dir) in ('asc','desc') then lower(sort_dir) else 'desc' end;
begin
  return query
  with base as (
    select
      pu.id, pu.slug, pu.title, pu.status, pu.price_amount, pu.currency, pu.price_cents, pu.source,
      case
        when q is null or length(trim(q)) = 0 then 0
        else
          (case when pu.title ilike '%'||q||'%' then 4 else 0 end) +
          (case when pu.slug  ilike '%'||q||'%' then 2 else 0 end) +
          (case when pu.sku   ilike '%'||q||'%' then 2 else 0 end) +
          (case when pu.category_slug ilike '%'||q||'%' then 1 else 0 end) +
          (case when exists (select 1 from unnest(coalesce(pu.tags_text, array[]::text[])) t where t ilike '%'||q||'%') then 1 else 0 end)
      end as relevance_score
    from public.products_unified_dedup pu
    where (statuses is null or pu.status = any(statuses))
      and (min_price is null or pu.price_amount >= min_price)
      and (max_price is null or pu.price_amount <= max_price)
      and (q is null or q = '' or (
            pu.title ilike '%'||q||'%' or pu.slug ilike '%'||q||'%' or pu.sku ilike '%'||q||'%' or
            pu.category_slug ilike '%'||q||'%' or exists (select 1 from unnest(coalesce(pu.tags_text, array[]::text[])) t where t ilike '%'||q||'%')
          ))
      and (category_slugs is null or pu.category_slug = any(category_slugs))
      and (skus is null or pu.sku = any(skus))
      and (sources is null or pu.source = any(sources))
      and (min_rating is null or pu.rating >= min_rating)
  )
  select b.id, b.slug, b.title, b.status, b.price_amount, b.currency, b.price_cents, b.source
  from base b
  order by
    case when v_sort = 'relevance' then b.relevance_score end desc nulls last,
    case when v_sort = 'price' and v_dir = 'asc'  then b.price_amount end asc  nulls last,
    case when v_sort = 'price' and v_dir = 'desc' then b.price_amount end desc nulls last,
    case when v_sort = 'title' and v_dir = 'asc'  then b.title end asc  nulls last,
    case when v_sort = 'title' and v_dir = 'desc' then b.title end desc nulls last,
    b.relevance_score desc, b.title asc
  limit greatest(limit_count, 0)
  offset greatest(offset_count, 0);
end;
$$;


ALTER FUNCTION "public"."search_products_v2"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer, "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products_v2_count"("q" "text" DEFAULT NULL::"text", "min_price" numeric DEFAULT NULL::numeric, "max_price" numeric DEFAULT NULL::numeric, "statuses" "text"[] DEFAULT ARRAY['active'::"text"], "category_slugs" "text"[] DEFAULT NULL::"text"[], "skus" "text"[] DEFAULT NULL::"text"[], "sources" "text"[] DEFAULT NULL::"text"[], "min_rating" real DEFAULT NULL::real) RETURNS bigint
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select count(*)
  from public.products_unified_dedup pu
  where (statuses is null or pu.status = any(statuses))
    and (min_price is null or pu.price_amount >= min_price)
    and (max_price is null or pu.price_amount <= max_price)
    and (q is null or q = '' or (
      pu.title ilike '%'||q||'%' or
      pu.slug ilike '%'||q||'%'  or
      pu.sku ilike '%'||q||'%'   or
      pu.category_slug ilike '%'||q||'%' or
      exists (select 1 from unnest(coalesce(pu.tags_text, array[]::text[])) t where t ilike '%'||q||'%')
    ))
    and (category_slugs is null or pu.category_slug = any(category_slugs))
    and (skus is null or pu.sku = any(skus))
    and (sources is null or pu.source = any(sources))
    and (min_rating is null or pu.rating >= min_rating);
$$;


ALTER FUNCTION "public"."search_products_v2_count"("q" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  limit_window interval := interval '24 hours';
  max_per_24h int := 6;
  now_ts timestamptz := now();
  v_uid uuid;
  row_rl record;
  v_user uuid := coalesce(p_user_id, auth.uid());
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Invalid rating';
  end if;

  select product_uid into v_uid
  from public.product_catalog
  where source_schema = p_source_schema
    and source_table  = p_source_table
    and source_pk     = p_source_pk;

  if v_uid is null then
    insert into public.product_catalog (source_schema, source_table, source_pk)
    values (p_source_schema, p_source_table, p_source_pk)
    returning product_uid into v_uid;
  end if;

  select * into row_rl from public.review_rate_limits where ip_hash = p_ip_hash;
  if found then
    if row_rl.last_at > now_ts - limit_window then
      if row_rl.count_24h >= max_per_24h then
        raise exception 'Rate limited';
      else
        update public.review_rate_limits
           set count_24h = row_rl.count_24h + 1, last_at = now_ts
         where ip_hash = p_ip_hash;
      end if;
    else
      update public.review_rate_limits set count_24h = 1, last_at = now_ts where ip_hash = p_ip_hash;
    end if;
  else
    insert into public.review_rate_limits (ip_hash, last_at, count_24h) values (p_ip_hash, now_ts, 1);
  end if;

  insert into public.reviews_unified (product_uid, user_id, rating, title, body, ip_hash, user_agent)
  values (v_uid, v_user, p_rating, nullif(trim(p_title),''), nullif(trim(p_body),''), p_ip_hash, p_user_agent);

  perform public.recalc_product_rating(v_uid);
  return v_uid;
end$$;


ALTER FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_image_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- сбрасываем старый current
  update public.ecom_product_image_versions
  set is_current = false
  where sku = new.sku;

  -- помечаем новую как текущую
  new.is_current := true;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_current_image_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update public.ecom_products
     set main_image_url = p_path
   where id = p_product_id;

  insert into public.ecom_product_image_versions(
    id, sku, path, source_url, uploaded_at, uploaded_by, is_current, product_uid
  )
  values (gen_random_uuid(), p_sku, p_path, p_source_url, now(), p_uploaded_by, true, p_product_id);
end;
$$;


ALTER FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin new.updated_at = now(); return new; end$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF p_refresh_mv THEN
    BEGIN
      EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.catalog_mv';
    EXCEPTION WHEN others THEN
      EXECUTE 'REFRESH MATERIALIZED VIEW public.catalog_mv';
    END;
  END IF;
  TRUNCATE TABLE public.catalog_published;
  INSERT INTO public.catalog_published SELECT * FROM public.catalog_mv;
END$$;


ALTER FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ecom_products_from_products"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_sku text := coalesce(new.sku, 'SKU-'||upper(replace(new.id::text,'-',''))::text);
begin
  -- clamp sku to allowed charset (A-Z0-9_-) and uppercase
  v_sku := upper(regexp_replace(v_sku, '[^A-Z0-9_-]+', '-', 'g'));

  if tg_op = 'INSERT' then
    insert into public.ecom_products (id, slug, title, short_desc, price, price_cents, currency, main_image_url, image_path, status, rating, images, specs, category_slug, sku, created_at, description, tags)
    values (
      new.id, new.slug, new.title, coalesce(new.short_desc, new.description, ''), new.price, new.price_cents, new.currency, new.main_image_url, coalesce(new.image_path, new.main_image_url), new.status, new.rating,
      coalesce(new.images, '[]'::jsonb),
      coalesce(new.specs, '{}'::jsonb),
      new.category_slug, v_sku, coalesce(new.created_at, now()), new.description,
      coalesce(new.tags, array[]::text[])
    )
    on conflict (id) do update set
      slug = excluded.slug,
      title = excluded.title,
      short_desc = excluded.short_desc,
      price = excluded.price,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      main_image_url = excluded.main_image_url,
      image_path = excluded.image_path,
      status = excluded.status,
      rating = excluded.rating,
      images = excluded.images,
      specs = excluded.specs,
      category_slug = excluded.category_slug,
      sku = excluded.sku,
      description = excluded.description,
      created_at = excluded.created_at,
      tags = excluded.tags;
    return null;
  elsif tg_op = 'UPDATE' then
    update public.ecom_products set
      slug = new.slug,
      title = new.title,
      short_desc = coalesce(new.short_desc, new.description, ''),
      price = new.price,
      price_cents = new.price_cents,
      currency = new.currency,
      main_image_url = new.main_image_url,
      image_path = coalesce(new.image_path, new.main_image_url),
      status = new.status,
      rating = new.rating,
      images = coalesce(new.images, '[]'::jsonb),
      specs = coalesce(new.specs, '{}'::jsonb),
      category_slug = new.category_slug,
      sku = upper(coalesce(new.sku, v_sku)),
      description = new.description,
      tags = coalesce(new.tags, array[]::text[])
    where id = new.id;
    return null;
  elsif tg_op = 'DELETE' then
    delete from public.ecom_products where id = old.id;
    return null;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_ecom_products_from_products"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_on_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare st text;
begin
  -- normalize enum to lowercase text once
  st := lower(new.status::text);

  if st in ('paid','succeeded') then
    update public.orders o
       set payment_status = 'succeeded'::payment_status,
           status = case when o.status in ('pending','failed','cancelled') then 'paid' else o.status end
     where o.id = new.order_id;

  elsif st in ('refunded','refund_succeeded','refund') then
    update public.orders o
       set payment_status = 'refunded'::payment_status,
           status = case when o.status = 'paid' then 'refunded' else o.status end
     where o.id = new.order_id;

  elsif st in ('failed','canceled','cancelled') then
    update public.orders o
       set payment_status = 'failed'::payment_status,
           status = case when o.status = 'pending' then 'cancelled' else o.status end
     where o.id = new.order_id;

  elsif st in ('requires_action','requires_payment_method','processing') then
    update public.orders o
       set payment_status = 'requires_action'::payment_status
     where o.id = new.order_id
       and o.payment_status is distinct from 'succeeded';
  end if;
  return null;
end;$$;


ALTER FUNCTION "public"."sync_order_on_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_on_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare oid uuid; typ text;
begin
  typ := lower(new.type);
  begin
    oid := nullif(coalesce(new.data->'metadata'->>'order_id',''), '')::uuid;
  exception when others then
    oid := null;
  end;
  if oid is null then
    return null;
  end if;

  if typ in ('payment_intent.succeeded','charge.succeeded') then
    update public.orders o
       set payment_status = 'succeeded',
           status = case when o.status in ('pending','failed','cancelled') then 'paid' else o.status end
     where o.id = oid;

  elsif typ in ('charge.refunded','charge.refund.updated','payment_intent.partially_refunded') then
    update public.orders o
       set payment_status = 'refunded',
           status = case when o.status = 'paid' then 'refunded' else o.status end
     where o.id = oid;

  elsif typ in ('payment_intent.payment_failed','payment_intent.canceled') then
    update public.orders o
       set payment_status = 'failed',
           status = case when o.status = 'pending' then 'cancelled' else o.status end
     where o.id = oid;
  end if;

  return null;
end;$$;


ALTER FUNCTION "public"."sync_order_on_webhook"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_image_path"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  bucket_prefix text := 'https://wsqhgnxmotswjantxopb.supabase.co/storage/v1/object/public/product-images/';
  full_url text;
begin
  -- защита от мусора
  if new.product_id is null then
    raise notice 'piv: product_id is null, id=% sku=%', new.id, new.sku;
    return new;
  end if;

  -- строим URL без фанатизма
  full_url := case
                when new.path is null or new.path = '' then null
                when new.path ~ '^(https?)://' then new.path
                else bucket_prefix || new.path
              end;

  -- синхроним только текущую версию
  if coalesce(new.is_current, true) then
    update public.ecom_products
    set main_image_url = full_url
    where id = new.product_id;

    if not found then
      raise notice 'piv: ecom_products row not found for % (sku=%)', new.product_id, new.sku;
    end if;
  end if;

  return new;

exception when others then
  -- логируем, но не роняем транзакцию → не будет 500 от PostgREST
  raise notice 'piv: sync failed: % (id=%, sku=%, product_id=%)', sqlerrm, new.id, new.sku, new.product_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_product_image_path"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."table_counts_small"("max_size_mb" integer DEFAULT 50) RETURNS TABLE("schema" "text", "table_name" "text", "exact_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  r record;
  sql text;
begin
  for r in
    select n.nspname as schema, c.relname as table_name, c.oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema','pg_toast')
      and c.relkind in ('r','p')
  loop
    if pg_total_relation_size(r.oid) < (max_size_mb * 1024 * 1024) then
      sql := format('select count(*)::bigint from %I.%I', r.schema, r.table_name);
      execute sql into exact_count;
    else
      exact_count := null;  -- слишком большая, не считаем
    end if;
    schema := r.schema;
    table_name := r.table_name;
    return next;
  end loop;
end
$$;


ALTER FUNCTION "public"."table_counts_small"("max_size_mb" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tf_rev_content_blocks"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN IF TG_OP='INSERT' THEN PERFORM public.cms_insert_revision('content_blocks',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL); RETURN NEW; ELSIF TG_OP='UPDATE' THEN PERFORM public.cms_insert_revision('content_blocks',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL); RETURN NEW; ELSE PERFORM public.cms_insert_revision('content_blocks',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL); RETURN OLD; END IF; END $$;


ALTER FUNCTION "public"."tf_rev_content_blocks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tf_rev_navigation_links"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN IF TG_OP='INSERT' THEN PERFORM public.cms_insert_revision('navigation_links',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL); RETURN NEW; ELSIF TG_OP='UPDATE' THEN PERFORM public.cms_insert_revision('navigation_links',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL); RETURN NEW; ELSE PERFORM public.cms_insert_revision('navigation_links',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL); RETURN OLD; END IF; END $$;


ALTER FUNCTION "public"."tf_rev_navigation_links"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tf_rev_page_sections"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN IF TG_OP='INSERT' THEN PERFORM public.cms_insert_revision('page_sections',NEW.id,NULL,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL); RETURN NEW; ELSIF TG_OP='UPDATE' THEN PERFORM public.cms_insert_revision('page_sections',NEW.id,NULL,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL); RETURN NEW; ELSE PERFORM public.cms_insert_revision('page_sections',OLD.id,NULL,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL); RETURN OLD; END IF; END $$;


ALTER FUNCTION "public"."tf_rev_page_sections"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tf_rev_site_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$ BEGIN IF TG_OP='INSERT' THEN PERFORM public.cms_insert_revision('site_settings',NULL,NEW.key,NEW.locale,jsonb_build_object('op','INSERT','new',to_jsonb(NEW)),NULL); RETURN NEW; ELSIF TG_OP='UPDATE' THEN PERFORM public.cms_insert_revision('site_settings',NULL,NEW.key,NEW.locale,jsonb_build_object('op','UPDATE','old',to_jsonb(OLD),'new',to_jsonb(NEW)),NULL); RETURN NEW; ELSE PERFORM public.cms_insert_revision('site_settings',NULL,OLD.key,OLD.locale,jsonb_build_object('op','DELETE','old',to_jsonb(OLD)),NULL); RETURN OLD; END IF; END $$;


ALTER FUNCTION "public"."tf_rev_site_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer DEFAULT 20) RETURNS TABLE("slug" "text", "count" bigint, "share" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with grouped as (
    select coalesce(nullif(trim(slug), ''), '-') as slug,
           count(*)::bigint as cnt
    from public.clicks
    where ts >= _from and ts <= _to
    group by 1
  )
  select g.slug,
         g.cnt as count,
         (g.cnt::numeric / nullif(sum(g.cnt) over (), 0)) as share
  from grouped g
  order by g.cnt desc
  limit coalesce(_limit, 20);
$$;


ALTER FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_payments_status_propagate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Compare textual representations to avoid trying to coerce '' into the enum type
  IF coalesce(old.status::text, '') = coalesce(new.status::text, '') THEN
    RETURN NULL; -- nothing changed
  END IF;

  -- rest of logic follows (example: propagate status to related table)
  -- INSERT YOUR EXISTING LOGIC HERE, using status::text or explicit casts when needed

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tr_payments_status_propagate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_recalc_after_order_items"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalc_order_totals(NEW.order_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_order_totals(OLD.order_id);
  END IF;
  RETURN NULL;
END$$;


ALTER FUNCTION "public"."tr_recalc_after_order_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_recalc_after_orders"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform public.recalc_order_totals(new.id);
  return null;
end$$;


ALTER FUNCTION "public"."tr_recalc_after_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_recalc_after_review_unified"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if (tg_op = 'INSERT') then
    perform public.recalc_product_rating(new.product_uid);
  elsif (tg_op = 'DELETE') then
    perform public.recalc_product_rating(old.product_uid);
  else
    if new.product_uid is distinct from old.product_uid
       or new.rating is distinct from old.rating then
      perform public.recalc_product_rating(coalesce(new.product_uid, old.product_uid));
    end if;
  end if;
  return null;
end$$;


ALTER FUNCTION "public"."tr_recalc_after_review_unified"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_cart_items_default_price"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.price_at_add IS NULL THEN
    SELECT ep.price INTO NEW.price_at_add
    FROM public.ecom_products ep
    WHERE ep.id = NEW.product_id;
  END IF;
  RETURN NEW;
END$$;


ALTER FUNCTION "public"."trg_cart_items_default_price"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_block_zero"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_total numeric;
begin
  -- интересуют только изменения статуса
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  -- считаем сумму из view
  select amount_total into v_total
  from public.order_v2
  where id = new.id;

  -- блокируем только, если целевой статус требует денег
  if new.status in ('paid','refunded') then
    if coalesce(v_total,0) <= 0 then
      raise exception 'order_total_must_be_positive (calculated=%)', v_total using errcode='P0001';
    end if;
  end if;

  -- на cancelled не ругаемся, пусть гасится
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_block_zero"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op='UPDATE'
     and old.status='pending'
     and new.status='cancelled'
     and exists (
       select 1 from public.payments p
       where p.order_id = new.id
         and p.status in ('paid','succeeded')
     ) then
    raise exception 'illegal_order_transition: already paid' using errcode='P0001';
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_guard_refund"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- блокируем любые попытки поставить refunded, если нет успешного платежа
  if new.status = 'refunded' then
    if not exists (
      select 1
      from public.payments p
      where p.order_id = new.id
        and p.status in ('paid','succeeded')
    ) then
      raise exception 'refund_without_successful_payment' using errcode='P0001';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_guard_refund"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    if lower(new.status::text) = 'paid' and coalesce(lower(old.status::text), '') <> 'paid' then
      perform public._inventory_apply_delta(new.id, 'sold', -1);
    end if;
    if lower(new.status::text) = 'refunded' and lower(coalesce(old.status::text, '')) in ('paid','fulfilled') then
      perform public._inventory_apply_delta(new.id, 'refund', +1);
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_inventory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_log_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_actor uuid := null;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, from_status, to_status, changed_by, reason)
    values (new.id, null, new.status, v_actor, 'create');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history(order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, v_actor);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_log_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_normalize_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.currency is not null then
    new.currency := upper(new.currency);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_normalize_currency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_status_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    perform public._order_try_validate_transition(old.status, new.status);
    insert into public.order_status_audit(order_id, old_status, new_status, changed_by, reason, source)
    values (new.id, old.status, new.status, coalesce(auth.uid(), null), null, 'orders.update');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_status_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orders_validate_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- exception: allow cancelled -> paid when there's a successful payment recorded
    if not (old.status = 'cancelled' and new.status = 'paid' and
            exists (select 1 from public.payments p
                    where p.order_id = new.id
                      and p.status in ('paid','succeeded'))) then
      perform public.order_validate_transition(old.status::text, new.status::text);
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orders_validate_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_payments_sync_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare v_from public.order_status;
begin
  if new.order_id is null then
    return new;
  end if;

  select o.status into v_from
  from public.orders o
  where o.id = new.order_id
  for update;

  if not found then
    return new;
  end if;

  if new.status in ('paid','succeeded','captured') then
    if public._order_try_validate_transition(v_from, 'paid') then
      update public.orders o
         set status = 'paid',
             paid_at = coalesce(o.paid_at, now()),
             amount_cents = coalesce(nullif(o.amount_cents,0), (new.amount * 100)::bigint),
             currency = upper(coalesce(o.currency, new.currency)),
             payment_intent_id = coalesce(o.payment_intent_id, nullif(new.provider_ref, ''))
       where o.id = new.order_id;
    end if;

  elsif new.status in ('failed','canceled') then
    if v_from = 'pending' and public._order_try_validate_transition(v_from, 'cancelled') then
      update public.orders o
         set status = 'cancelled'
       where o.id = new.order_id;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_payments_sync_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reject_profanity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.title ~* '(ху[ий]\b|dild|sex|porno)' then
    raise exception 'profanity_blocked' using errcode='P0001';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_reject_profanity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_resolve_impression_pid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if (new.product_id is null or not exists (select 1 from public.ecom_products where id = new.product_id)) and new.slug is not null then
    select id into new.product_id from public.ecom_products where slug = new.slug limit 1;
    -- если не нашли — остаётся NULL, вставку не ломаем
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_resolve_impression_pid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_item_money"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- total НЕ трогаем: это generated
  if new.unit_price is null or new.unit_price <= 0 then
    raise exception 'invalid_price: %', new.unit_price using errcode='22003';
  end if;

  if new.qty is null or new.qty <= 0 then
    raise exception 'invalid_qty: %', new.qty using errcode='22003';
  end if;

  -- мягкий верхний предел (подстрой как нужно)
  if new.unit_price > 100000 then
    raise exception 'price_too_high: %', new.unit_price using errcode='22003';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_validate_item_money"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_rating_stats" (
    "product_uid" "uuid" NOT NULL,
    "avg_rating" numeric(3,2) DEFAULT 0 NOT NULL,
    "ratings_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_rating_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Brand" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "discounts"."Brand" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "discounts"."Category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Coupon" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "extensions"."citext" NOT NULL,
    "discountId" "uuid" NOT NULL,
    "maxRedemptions" integer,
    "redemptions" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb",
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone
);


ALTER TABLE "discounts"."Coupon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."CouponRedemption" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "couponId" "uuid",
    "discountId" "uuid" NOT NULL,
    "userId" "text",
    "orderId" "text",
    "amountCents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "redeemedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "discounts"."CouponRedemption" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Discount" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "discounts"."DiscountType" NOT NULL,
    "description" "text",
    "percentOff" numeric(5,4),
    "amountOffCts" integer,
    "currency" "text",
    "bogoBuyQty" integer,
    "bogoGetQty" integer,
    "stackable" boolean DEFAULT false NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "minSubtotalCts" integer,
    "minQty" integer,
    "startAt" timestamp(3) without time zone,
    "endAt" timestamp(3) without time zone,
    "channel" "text" DEFAULT 'all'::"text" NOT NULL,
    "usageLimitTotal" integer,
    "usageLimitPerUser" integer,
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "discounts"."Discount" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."DiscountAssignment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discountId" "uuid" NOT NULL,
    "scope" "discounts"."AssignmentScope" NOT NULL,
    "refId" "text" NOT NULL
);


ALTER TABLE "discounts"."DiscountAssignment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."DiscountExclusion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discountId" "uuid" NOT NULL,
    "scope" "discounts"."AssignmentScope" NOT NULL,
    "refId" "text" NOT NULL
);


ALTER TABLE "discounts"."DiscountExclusion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Product" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "brandId" "uuid",
    "vendorId" "uuid",
    "categoryId" "uuid",
    "priceCents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "discounts"."Product" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "discounts"."Vendor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "discounts"."Vendor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ab_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ts" timestamp with time zone,
    "test" "text" NOT NULL,
    "variant" "text" NOT NULL,
    "event" "text" NOT NULL,
    "href" "text",
    "props" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "ab_events_variant_check" CHECK (("variant" = ANY (ARRAY['A'::"text", 'B'::"text"])))
);


ALTER TABLE "public"."ab_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_emails" (
    "email" "text" NOT NULL
);

ALTER TABLE ONLY "public"."admin_emails" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_group" (
    "id" integer NOT NULL,
    "name" character varying(150) NOT NULL
);

ALTER TABLE ONLY "public"."auth_group" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_group" OWNER TO "postgres";


ALTER TABLE "public"."auth_group" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_group_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auth_group_permissions" (
    "id" bigint NOT NULL,
    "group_id" integer NOT NULL,
    "permission_id" integer NOT NULL
);

ALTER TABLE ONLY "public"."auth_group_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_group_permissions" OWNER TO "postgres";


ALTER TABLE "public"."auth_group_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_group_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auth_permission" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "content_type_id" integer NOT NULL,
    "codename" character varying(100) NOT NULL
);

ALTER TABLE ONLY "public"."auth_permission" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_permission" OWNER TO "postgres";


ALTER TABLE "public"."auth_permission" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_permission_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auth_roles" (
    "role" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."auth_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_user" (
    "id" integer NOT NULL,
    "password" character varying(128) NOT NULL,
    "last_login" timestamp with time zone,
    "is_superuser" boolean NOT NULL,
    "username" character varying(150) NOT NULL,
    "first_name" character varying(150) NOT NULL,
    "last_name" character varying(150) NOT NULL,
    "email" character varying(254) NOT NULL,
    "is_staff" boolean NOT NULL,
    "is_active" boolean NOT NULL,
    "date_joined" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."auth_user" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_user_groups" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "group_id" integer NOT NULL
);

ALTER TABLE ONLY "public"."auth_user_groups" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user_groups" OWNER TO "postgres";


ALTER TABLE "public"."auth_user_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."auth_user" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auth_user_user_permissions" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "permission_id" integer NOT NULL
);

ALTER TABLE ONLY "public"."auth_user_user_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user_user_permissions" OWNER TO "postgres";


ALTER TABLE "public"."auth_user_user_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_user_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auth_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_login_at" timestamp with time zone,
    "password_updated_at" timestamp with time zone,
    "token_version" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."auth_users" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "image_url" "text" NOT NULL,
    "href" "text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "active_from" timestamp with time zone,
    "active_to" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banners_active_window_chk" CHECK ((("active_from" IS NULL) OR ("active_to" IS NULL) OR ("active_from" <= "active_to")))
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


COMMENT ON TABLE "public"."banners" IS 'CMS-managed hero and promotional banners for the storefront.';



COMMENT ON COLUMN "public"."banners"."href" IS 'Destination URL for the banner call-to-action.';



COMMENT ON COLUMN "public"."banners"."priority" IS 'Higher values surface the banner earlier in the slider.';



CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."carts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."catalog_mv" AS
 SELECT "id",
    "slug",
    "title",
    "price",
    "rating",
    "category_slug",
    "created_at",
    ( SELECT "v"."path"
           FROM "public"."ecom_product_image_versions" "v"
          WHERE (("v"."product_id" = "p"."id") AND COALESCE("v"."is_current", true))
          ORDER BY "v"."uploaded_at" DESC, "v"."id" DESC
         LIMIT 1) AS "thumbnail_path"
   FROM "public"."ecom_products" "p"
  WHERE ("status" = ANY (ARRAY['active'::"text", 'published'::"text"]))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."catalog_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_published" (
    "id" "uuid" NOT NULL,
    "slug" "text",
    "title" "text",
    "price" numeric(10,2),
    "rating" real,
    "category_slug" "text",
    "created_at" timestamp with time zone,
    "thumbnail_path" "text"
);


ALTER TABLE "public"."catalog_published" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip" "inet",
    "user_agent" "text",
    "referrer" "text",
    "session_id" "text"
);


ALTER TABLE "public"."shop_clicks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."clicks" WITH ("security_invoker"='true') AS
 SELECT "created_at" AS "ts",
    ("product_id")::"text" AS "slug",
    COALESCE("referrer", '-'::"text") AS "referrer",
    NULL::"jsonb" AS "params"
   FROM "public"."shop_clicks";


ALTER VIEW "public"."clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cms_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "cms_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))
);


ALTER TABLE "public"."cms_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_impressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip" "inet",
    "user_agent" "text",
    "referrer" "text",
    "session_id" "text",
    "slug" "text"
);


ALTER TABLE "public"."product_impressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_impressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip" "inet",
    "user_agent" "text",
    "referrer" "text",
    "session_id" "text"
);


ALTER TABLE "public"."shop_impressions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."co_viewed_mv" AS
 WITH "events" AS (
         SELECT "product_impressions"."session_id",
            "product_impressions"."product_id",
            "product_impressions"."created_at"
           FROM "public"."product_impressions"
          WHERE (("product_impressions"."created_at" >= ("now"() - '60 days'::interval)) AND ("product_impressions"."session_id" IS NOT NULL))
        UNION ALL
         SELECT "shop_clicks"."session_id",
            "shop_clicks"."product_id",
            "shop_clicks"."created_at"
           FROM "public"."shop_clicks"
          WHERE (("shop_clicks"."created_at" >= ("now"() - '60 days'::interval)) AND ("shop_clicks"."session_id" IS NOT NULL))
        UNION ALL
         SELECT "shop_impressions"."session_id",
            "shop_impressions"."product_id",
            "shop_impressions"."created_at"
           FROM "public"."shop_impressions"
          WHERE (("shop_impressions"."created_at" >= ("now"() - '60 days'::interval)) AND ("shop_impressions"."session_id" IS NOT NULL))
        ), "session_products" AS (
         SELECT DISTINCT "events"."session_id",
            "events"."product_id"
           FROM "events"
        ), "pairs" AS (
         SELECT "a"."product_id" AS "product_a",
            "b"."product_id" AS "product_b",
            "a"."session_id"
           FROM ("session_products" "a"
             JOIN "session_products" "b" ON ((("a"."session_id" = "b"."session_id") AND ("a"."product_id" < "b"."product_id"))))
        ), "co_counts" AS (
         SELECT "pairs"."product_a",
            "pairs"."product_b",
            "count"(*) AS "co_count"
           FROM "pairs"
          GROUP BY "pairs"."product_a", "pairs"."product_b"
        ), "prod_counts" AS (
         SELECT "session_products"."product_id",
            "count"(*) AS "cnt"
           FROM "session_products"
          GROUP BY "session_products"."product_id"
        )
 SELECT "c"."product_a",
    "c"."product_b",
    ((("c"."co_count")::real / NULLIF("sqrt"(((("pa"."cnt")::real * ("pb"."cnt")::real))::double precision), (0)::double precision)))::real AS "score",
    "now"() AS "updated_at"
   FROM (("co_counts" "c"
     JOIN "prod_counts" "pa" ON (("pa"."product_id" = "c"."product_a")))
     JOIN "prod_counts" "pb" ON (("pb"."product_id" = "c"."product_b")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."co_viewed_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text",
    "email" "text",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "type" "text" NOT NULL,
    "slug" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "content_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "content_blocks_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."content_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid",
    "target_key" "text",
    "locale" "text",
    "snapshot" "jsonb" NOT NULL,
    "author" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message" "text"
);


ALTER TABLE "public"."content_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."django_admin_log" (
    "id" integer NOT NULL,
    "action_time" timestamp with time zone NOT NULL,
    "object_id" "text",
    "object_repr" character varying(200) NOT NULL,
    "action_flag" smallint NOT NULL,
    "change_message" "text" NOT NULL,
    "content_type_id" integer,
    "user_id" integer NOT NULL,
    CONSTRAINT "django_admin_log_action_flag_check" CHECK (("action_flag" >= 0))
);

ALTER TABLE ONLY "public"."django_admin_log" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_admin_log" OWNER TO "postgres";


ALTER TABLE "public"."django_admin_log" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_admin_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."django_content_type" (
    "id" integer NOT NULL,
    "app_label" character varying(100) NOT NULL,
    "model" character varying(100) NOT NULL
);

ALTER TABLE ONLY "public"."django_content_type" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_content_type" OWNER TO "postgres";


ALTER TABLE "public"."django_content_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_content_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."django_migrations" (
    "id" bigint NOT NULL,
    "app" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "applied" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."django_migrations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_migrations" OWNER TO "postgres";


ALTER TABLE "public"."django_migrations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_migrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."django_session" (
    "session_key" character varying(40) NOT NULL,
    "session_data" "text" NOT NULL,
    "expire_date" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."django_session" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecom_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."ecom_categories" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecom_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ecom_products_view" WITH ("security_invoker"='true') AS
 SELECT "id",
    "slug",
    "title",
    "short_desc",
    "description",
    "price",
    "price_cents",
    "currency",
    COALESCE("main_image_url", "image_path") AS "main_image_url",
    "status",
    "rating",
    "images",
    "specs",
    "category_slug",
    "tags",
    "sku",
    "created_at",
    "image_path"
   FROM "public"."ecom_products"
  WHERE (("deleted_at" IS NULL) AND (COALESCE("to_delete", false) = false) AND ("lower"("status") = ANY (ARRAY['active'::"text", 'published'::"text"])));


ALTER VIEW "public"."ecom_products_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ecom_products_with_ratings" WITH ("security_invoker"='on') AS
 SELECT "p"."id",
    "p"."slug",
    "p"."title",
    "p"."price",
    "p"."rating",
    "p"."images",
    "p"."category_slug",
    "p"."tags",
    "p"."short_desc",
    "p"."specs",
    "p"."created_at",
    "p"."status",
    "s"."avg_rating",
    "s"."ratings_count"
   FROM (("public"."ecom_products" "p"
     LEFT JOIN "archive"."product_catalog" "c" ON ((("c"."source_schema" = 'public'::"text") AND ("c"."source_table" = 'ecom_products'::"text") AND ("c"."source_pk" = ("p"."id")::"text"))))
     LEFT JOIN "public"."product_rating_stats" "s" ON (("s"."product_uid" = "c"."product_uid")));


ALTER VIEW "public"."ecom_products_with_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecom_wishlist" (
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ecom_wishlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_toggles" (
    "key" "text" NOT NULL,
    "description" "text",
    "value_bool" boolean,
    "value_json" "jsonb",
    "is_public" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."feature_toggles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "locale" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_by" "uuid",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    CONSTRAINT "form_entries_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'processing'::"text", 'done'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."form_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "schema_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."form_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."impressions" WITH ("security_invoker"='true') AS
 SELECT "created_at" AS "ts",
    ("product_id")::"text" AS "slug",
    'unknown'::"text" AS "device",
    '-'::"text" AS "lang"
   FROM "public"."shop_impressions";


ALTER VIEW "public"."impressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_runs" (
    "id" bigint NOT NULL,
    "jobname" "text" NOT NULL,
    "status" integer NOT NULL,
    "response" "jsonb",
    "ran_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_runs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_runs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_runs_id_seq" OWNED BY "public"."job_runs"."id";



CREATE UNLOGGED TABLE "public"."line_total_is_generated" (
    "coalesce" boolean,
    "id" bigint NOT NULL
);


ALTER TABLE "public"."line_total_is_generated" OWNER TO "postgres";


CREATE UNLOGGED SEQUENCE "public"."line_total_is_generated_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."line_total_is_generated_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."line_total_is_generated_id_seq" OWNED BY "public"."line_total_is_generated"."id";



CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket" "text" DEFAULT 'public-media'::"text" NOT NULL,
    "storage_key" "text" NOT NULL,
    "mime_type" "text",
    "width" integer,
    "height" integer,
    "size_bytes" bigint,
    "alt" "text",
    "description" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checksum" "text"
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navigation_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "menu" "text" NOT NULL,
    "label" "text" NOT NULL,
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published" boolean DEFAULT true NOT NULL,
    "is_external" boolean DEFAULT false NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."navigation_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "click_id" "text",
    "target_url" "text",
    "target_url_final" "text",
    "target_host" "text",
    "params" "jsonb" DEFAULT '{}'::"jsonb",
    "referrer" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."offer_clicks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."offers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."offers_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "title" "text" NOT NULL,
    "qty" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) GENERATED ALWAYS AS ((("qty")::numeric * "unit_price")) STORED,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "chk_order_items_qty_pos" CHECK (("qty" >= 1)),
    CONSTRAINT "order_items_qty_check" CHECK (("qty" > 0))
);

ALTER TABLE ONLY "public"."order_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "provider" "text" NOT NULL,
    "provider_ref" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_payments_amount_pos" CHECK (("amount" >= (0)::numeric))
);

ALTER TABLE ONLY "public"."payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_history_v" WITH ("security_invoker"='true') AS
 SELECT "id" AS "order_id",
    "created_at",
    (COALESCE("grand_total", ( SELECT "sum"("oi"."total") AS "sum"
           FROM "public"."order_items" "oi"
          WHERE ("oi"."order_id" = "o"."id")), (("subtotal" - "discount_total") + "shipping_total"), (0)::numeric))::numeric(10,2) AS "amount",
    "currency",
    COALESCE(( SELECT ("p"."status")::"text" AS "status"
           FROM "public"."payments" "p"
          WHERE ("p"."order_id" = "o"."id")
          ORDER BY
                CASE "p"."status"
                    WHEN 'succeeded'::"public"."payment_status" THEN 3
                    WHEN 'pending'::"public"."payment_status" THEN 2
                    ELSE 1
                END DESC, "p"."created_at" DESC
         LIMIT 1), ("status")::"text") AS "status"
   FROM "public"."orders" "o";


ALTER VIEW "public"."order_history_v" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_items_v" WITH ("security_invoker"='on') AS
 SELECT "id",
    "order_id",
    "product_id",
    "variant_id",
    "title",
    "qty",
    "unit_price",
    "total",
    "total" AS "line_total"
   FROM "public"."order_items" "oi";


ALTER VIEW "public"."order_items_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_audit" (
    "id" bigint NOT NULL,
    "order_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "reason" "text",
    "source" "text"
);

ALTER TABLE ONLY "public"."order_status_audit" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_status_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_status_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_status_audit_id_seq" OWNED BY "public"."order_status_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "changed_by" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_v2" WITH ("security_invoker"='true') AS
 SELECT "id",
    "user_id",
    "created_at",
    (COALESCE("subtotal", (0)::numeric))::numeric(10,2) AS "amount_subtotal",
    (COALESCE("discount_total", (0)::numeric))::numeric(10,2) AS "amount_discounts",
    (COALESCE("shipping_total", (0)::numeric))::numeric(10,2) AS "amount_tax",
    (COALESCE("grand_total", ( SELECT "sum"("oi"."total") AS "sum"
           FROM "public"."order_items" "oi"
          WHERE ("oi"."order_id" = "o"."id")), (("subtotal" - "discount_total") + "shipping_total"), (0)::numeric))::numeric(10,2) AS "amount_total",
    "currency",
    "status",
    COALESCE("payment_status", ( SELECT "p"."status"
           FROM "public"."payments" "p"
          WHERE ("p"."order_id" = "o"."id")
          ORDER BY "p"."created_at" DESC
         LIMIT 1)) AS "payment_status"
   FROM "public"."orders" "o";


ALTER VIEW "public"."order_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders_archive" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text",
    "payment_status" "text",
    "subtotal" numeric,
    "discount_total" numeric,
    "shipping_total" numeric,
    "grand_total" numeric,
    "currency" "text",
    "created_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "checkout_metadata" "jsonb",
    "contact_email" "text",
    "metadata_b" "jsonb",
    "amount_cents" bigint,
    "payment_intent_id" "text",
    "archived_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "archive_run_id" "uuid" NOT NULL,
    "archived_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."orders_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders_archive" IS 'Архив заказов. Хранит снимки вместе с вложенными элементами';



CREATE TABLE IF NOT EXISTS "public"."orders_archive_export" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "payload_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "size_bytes" bigint DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."orders_archive_export" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_path" "text" NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "block_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_draft" boolean DEFAULT false NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."page_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_events" (
    "event_id" "text" NOT NULL,
    "event_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."processed_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "p"."id",
            "p"."sku",
            "p"."title",
            "p"."slug",
            "p"."category_slug",
            "p"."created_at",
            "p"."currency",
            COALESCE("p"."price_cents", (("round"(("p"."price" * (100)::numeric)))::integer)::bigint) AS "base_cents"
           FROM "public"."ecom_products" "p"
          WHERE (("p"."status_lc" = ANY (ARRAY['published'::"text", 'active'::"text"])) AND ("p"."deleted_at" IS NULL))
        ), "best_discount" AS (
         SELECT "b_1"."id" AS "product_id",
            "d"."id" AS "discount_id",
            "d"."name" AS "discount_name",
            "d"."percentOff",
            "d"."amountOffCts",
            "d"."priority"
           FROM ("base" "b_1"
             LEFT JOIN LATERAL ( SELECT "d_1"."id",
                    "d_1"."name",
                    "d_1"."type",
                    "d_1"."description",
                    "d_1"."percentOff",
                    "d_1"."amountOffCts",
                    "d_1"."currency",
                    "d_1"."bogoBuyQty",
                    "d_1"."bogoGetQty",
                    "d_1"."stackable",
                    "d_1"."priority",
                    "d_1"."minSubtotalCts",
                    "d_1"."minQty",
                    "d_1"."startAt",
                    "d_1"."endAt",
                    "d_1"."channel",
                    "d_1"."usageLimitTotal",
                    "d_1"."usageLimitPerUser",
                    "d_1"."active",
                    "d_1"."createdAt",
                    "d_1"."updatedAt"
                   FROM ("discounts"."DiscountAssignment" "da"
                     JOIN "discounts"."Discount" "d_1" ON (("d_1"."id" = "da"."discountId")))
                  WHERE (((("da"."scope" = 'PRODUCT'::"discounts"."AssignmentScope") AND ("da"."refId" = ("b_1"."id")::"text")) OR (("da"."scope" = 'CATEGORY'::"discounts"."AssignmentScope") AND ("da"."refId" = "b_1"."category_slug"))) AND ("d_1"."active" = true) AND (("d_1"."startAt" IS NULL) OR ("d_1"."startAt" <= "now"())) AND (("d_1"."endAt" IS NULL) OR ("d_1"."endAt" >= "now"())))
                  ORDER BY "d_1"."priority" DESC NULLS LAST, "d_1"."updatedAt" DESC NULLS LAST, "d_1"."createdAt" DESC
                 LIMIT 1) "d" ON (true))
        )
 SELECT "b"."id",
    "b"."sku",
    "b"."title" AS "name",
        CASE
            WHEN (("bd"."discount_id" IS NOT NULL) AND ("bd"."percentOff" IS NOT NULL)) THEN (("round"((("b"."base_cents")::numeric * ((1)::numeric - "bd"."percentOff"))))::integer)::bigint
            WHEN (("bd"."discount_id" IS NOT NULL) AND ("bd"."amountOffCts" IS NOT NULL)) THEN GREATEST(("b"."base_cents" - "bd"."amountOffCts"), (0)::bigint)
            ELSE "b"."base_cents"
        END AS "priceCents",
    COALESCE("b"."currency", 'USD'::"text") AS "currency",
    "b"."created_at" AS "updatedAt"
   FROM ("base" "b"
     LEFT JOIN "best_discount" "bd" ON (("bd"."product_id" = "b"."id")));


ALTER VIEW "public"."product" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_catalog" WITH ("security_invoker"='on') AS
 SELECT "product_uid",
    "slug",
    "source_schema",
    "source_table",
    "source_pk",
    "title",
    "created_at"
   FROM "archive"."product_catalog";


ALTER VIEW "public"."product_catalog" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_catalog_v" WITH ("security_invoker"='on') AS
 SELECT "product_uid",
    "slug",
    "source_schema",
    "source_table",
    "source_pk",
    "title",
    "created_at"
   FROM "archive"."product_catalog";


ALTER VIEW "public"."product_catalog_v" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_impressions_30d" WITH ("security_invoker"='true') AS
 SELECT COALESCE(("product_id")::"text", 'unknown'::"text") AS "product_key",
    "slug",
    "date_trunc"('day'::"text", "created_at") AS "day",
    "count"(*) AS "impressions"
   FROM "public"."product_impressions"
  WHERE ("created_at" >= ("now"() - '30 days'::interval))
  GROUP BY COALESCE(("product_id")::"text", 'unknown'::"text"), "slug", ("date_trunc"('day'::"text", "created_at"));


ALTER VIEW "public"."product_impressions_30d" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_review_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "root_review_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "review_raw_id" "uuid",
    "author_id" "uuid",
    "author_role" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_review_messages_author_role_check" CHECK (("author_role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);

ALTER TABLE ONLY "public"."product_review_messages" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_review_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_reviews_admin_v" WITH ("security_invoker"='true') AS
 SELECT "r"."id" AS "review_id",
    "r"."id",
    "r"."user_id" AS "reviewer_id",
    "r"."product_id" AS "product_uid",
    'public'::"text" AS "source_schema",
    'product_reviews_raw'::"text" AS "source_table",
    ((("r"."product_id")::"text" || ':'::"text") || ("r"."user_id")::"text") AS "source_pk",
    "p"."title" AS "product_title",
    "p"."slug" AS "product_slug",
    "r"."rating",
    "r"."title" AS "review_title",
    "r"."body" AS "review_body",
    "r"."status",
    "r"."created_at"
   FROM ("public"."product_reviews_raw" "r"
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "r"."product_id")))
  WHERE ("lower"(COALESCE("r"."status", 'pending'::"text")) = 'pending'::"text");


ALTER VIEW "public"."product_reviews_admin_v" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_with_discount" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "p"."id",
            "p"."sku",
            "p"."title",
            "p"."slug",
            "p"."category_slug",
            "p"."created_at",
            "p"."currency",
            COALESCE("p"."price_cents", (("round"(("p"."price" * (100)::numeric)))::integer)::bigint) AS "base_cents"
           FROM "public"."ecom_products" "p"
          WHERE (("p"."status_lc" = ANY (ARRAY['published'::"text", 'active'::"text"])) AND ("p"."deleted_at" IS NULL))
        ), "best_discount" AS (
         SELECT "b_1"."id" AS "product_id",
            "d"."id" AS "discount_id",
            "d"."name" AS "discount_name",
            "d"."percentOff",
            "d"."amountOffCts",
            "d"."priority"
           FROM ("base" "b_1"
             LEFT JOIN LATERAL ( SELECT "d_1"."id",
                    "d_1"."name",
                    "d_1"."type",
                    "d_1"."description",
                    "d_1"."percentOff",
                    "d_1"."amountOffCts",
                    "d_1"."currency",
                    "d_1"."bogoBuyQty",
                    "d_1"."bogoGetQty",
                    "d_1"."stackable",
                    "d_1"."priority",
                    "d_1"."minSubtotalCts",
                    "d_1"."minQty",
                    "d_1"."startAt",
                    "d_1"."endAt",
                    "d_1"."channel",
                    "d_1"."usageLimitTotal",
                    "d_1"."usageLimitPerUser",
                    "d_1"."active",
                    "d_1"."createdAt",
                    "d_1"."updatedAt"
                   FROM ("discounts"."DiscountAssignment" "da"
                     JOIN "discounts"."Discount" "d_1" ON (("d_1"."id" = "da"."discountId")))
                  WHERE (((("da"."scope" = 'PRODUCT'::"discounts"."AssignmentScope") AND ("da"."refId" = ("b_1"."id")::"text")) OR (("da"."scope" = 'CATEGORY'::"discounts"."AssignmentScope") AND ("da"."refId" = "b_1"."category_slug"))) AND ("d_1"."active" = true) AND (("d_1"."startAt" IS NULL) OR ("d_1"."startAt" <= "now"())) AND (("d_1"."endAt" IS NULL) OR ("d_1"."endAt" >= "now"())))
                  ORDER BY "d_1"."priority" DESC NULLS LAST, "d_1"."updatedAt" DESC NULLS LAST, "d_1"."createdAt" DESC
                 LIMIT 1) "d" ON (true))
        )
 SELECT "b"."id",
    "b"."sku",
    "b"."title",
    "b"."slug",
    "b"."category_slug",
    "b"."created_at",
    "b"."currency",
    "b"."base_cents",
    "bd"."discount_id",
    "bd"."discount_name",
    "bd"."percentOff",
    "bd"."amountOffCts",
        CASE
            WHEN (("bd"."discount_id" IS NOT NULL) AND ("bd"."percentOff" IS NOT NULL)) THEN (("round"((("b"."base_cents")::numeric * ((1)::numeric - "bd"."percentOff"))))::integer)::bigint
            WHEN (("bd"."discount_id" IS NOT NULL) AND ("bd"."amountOffCts" IS NOT NULL)) THEN GREATEST(("b"."base_cents" - "bd"."amountOffCts"), (0)::bigint)
            ELSE "b"."base_cents"
        END AS "effective_price_cents"
   FROM ("base" "b"
     LEFT JOIN "best_discount" "bd" ON (("bd"."product_id" = "b"."id")));


ALTER VIEW "public"."product_with_discount" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_with_discount_public" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "p"."id",
            "p"."sku",
            "p"."title" AS "name",
            "p"."slug",
            "p"."category_slug",
            "p"."rating",
            "p"."created_at",
            "public"."_thumbnail_for_product"("p"."id", "p"."sku", "p"."slug") AS "thumbnail_path",
            COALESCE("p"."price_cents", (("round"(("p"."price" * (100)::numeric)))::integer)::bigint) AS "base_cents",
            COALESCE("p"."currency", 'USD'::"text") AS "currency"
           FROM "public"."ecom_products" "p"
          WHERE (("p"."status_lc" = ANY (ARRAY['published'::"text", 'active'::"text"])) AND ("p"."deleted_at" IS NULL))
        ), "best_discount" AS (
         SELECT "b_1"."id" AS "product_id",
            "bd_1"."percent_off",
            "bd_1"."amount_off_cents"
           FROM ("base" "b_1"
             LEFT JOIN LATERAL "public"."_best_discount_for_product"("b_1"."id", "b_1"."category_slug") "bd_1"("percent_off", "amount_off_cents") ON (true))
        )
 SELECT "b"."id",
    "b"."sku",
    "b"."name",
    "b"."slug",
    "b"."base_cents" AS "basePriceCents",
        CASE
            WHEN ("bd"."percent_off" IS NOT NULL) THEN (("round"((("b"."base_cents")::numeric * ((1)::numeric - "bd"."percent_off"))))::integer)::bigint
            WHEN ("bd"."amount_off_cents" IS NOT NULL) THEN GREATEST(("b"."base_cents" - "bd"."amount_off_cents"), (0)::bigint)
            ELSE "b"."base_cents"
        END AS "effectivePriceCents",
        CASE
            WHEN ("bd"."percent_off" IS NOT NULL) THEN (("round"((("b"."base_cents")::numeric * ((1)::numeric - "bd"."percent_off"))))::integer)::bigint
            WHEN ("bd"."amount_off_cents" IS NOT NULL) THEN GREATEST(("b"."base_cents" - "bd"."amount_off_cents"), (0)::bigint)
            ELSE "b"."base_cents"
        END AS "priceCents",
    (("bd"."percent_off" IS NOT NULL) OR ("bd"."amount_off_cents" IS NOT NULL)) AS "hasDiscount",
    "b"."currency",
    "b"."category_slug",
    "b"."rating",
    "b"."created_at",
    "b"."thumbnail_path",
    "b"."thumbnail_path" AS "thumbnail"
   FROM ("base" "b"
     LEFT JOIN "best_discount" "bd" ON (("bd"."product_id" = "b"."id")));


ALTER VIEW "public"."product_with_discount_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products_unified_dedup" WITH ("security_invoker"='true') AS
 WITH "unioned" AS (
         SELECT "p"."id",
            "p"."slug",
            "p"."title",
            "p"."status",
            ("p"."price")::numeric AS "price_amount",
            'USD'::"text" AS "currency",
            ("round"(("p"."price" * (100)::numeric)))::integer AS "price_cents",
            'ecom'::"text" AS "source",
            COALESCE("p"."created_at", "now"()) AS "created_at",
            1 AS "source_priority",
            "p"."category_slug",
            "p"."sku",
            ARRAY( SELECT "unnest"(COALESCE("p"."tags", ARRAY[]::"text"[])) AS "unnest") AS "tags_text",
            "p"."rating"
           FROM "public"."ecom_products" "p"
          WHERE ("p"."status" = ANY (ARRAY['active'::"text", 'published'::"text"]))
        UNION ALL
         SELECT "pr"."id",
            "pr"."slug",
            "pr"."title",
            "pr"."status",
            (("pr"."price_cents")::numeric / 100.0) AS "price_amount",
            "pr"."currency",
            "pr"."price_cents",
            'products'::"text" AS "source",
            COALESCE("pr"."created_at", "now"()) AS "created_at",
            2 AS "source_priority",
            "pr"."category_slug",
            "pr"."sku",
            COALESCE(ARRAY( SELECT "jsonb_array_elements_text"("pr"."tags") AS "jsonb_array_elements_text"), ARRAY[]::"text"[]) AS "tags_text",
            ("pr"."rating")::real AS "rating"
           FROM "trash"."products_legacy_20251022" "pr"
          WHERE ("pr"."status" = 'active'::"text")
        ), "ranked" AS (
         SELECT "u"."id",
            "u"."slug",
            "u"."title",
            "u"."status",
            "u"."price_amount",
            "u"."currency",
            "u"."price_cents",
            "u"."source",
            "u"."created_at",
            "u"."source_priority",
            "u"."category_slug",
            "u"."sku",
            "u"."tags_text",
            "u"."rating",
            "row_number"() OVER (PARTITION BY "u"."slug" ORDER BY "u"."source_priority", "u"."price_amount", "u"."created_at" DESC, "u"."id") AS "rn"
           FROM "unioned" "u"
        )
 SELECT "id",
    "slug",
    "title",
    "status",
    "price_amount",
    "currency",
    "price_cents",
    "source",
    "category_slug",
    "sku",
    "tags_text",
    "rating"
   FROM "ranked"
  WHERE ("rn" = 1);


ALTER VIEW "public"."products_unified_dedup" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products_v" WITH ("security_invoker"='on') AS
 SELECT "slug",
    "main_image_url" AS "image_path",
    "updated_at"
   FROM "trash"."products_legacy_20251022"
  WHERE ("status" = 'active'::"text");


ALTER VIEW "public"."products_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "kind" "public"."promotion_action_kind" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promotion_actions" OWNER TO "postgres";


COMMENT ON TABLE "public"."promotion_actions" IS 'Discount and reward actions attached to a promotion.';



COMMENT ON COLUMN "public"."promotion_actions"."config" IS 'Action specific configuration (percentage, fixed amount, thresholds, etc.).';



CREATE TABLE IF NOT EXISTS "public"."promotion_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "kind" "public"."promotion_condition_kind" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promotion_conditions" OWNER TO "postgres";


COMMENT ON TABLE "public"."promotion_conditions" IS 'Eligibility constraints that must pass before a promotion can apply.';



COMMENT ON COLUMN "public"."promotion_conditions"."config" IS 'Condition specific JSON (product ids, category slugs, totals, segments, etc.).';



CREATE TABLE IF NOT EXISTS "public"."promotion_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "usage_limit_total" integer,
    "usage_limit_per_user" integer,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promotion_coupons_limits_positive" CHECK (((COALESCE("usage_limit_total", 0) >= 0) AND (COALESCE("usage_limit_per_user", 0) >= 0)))
);


ALTER TABLE "public"."promotion_coupons" OWNER TO "postgres";


COMMENT ON TABLE "public"."promotion_coupons" IS 'Coupon codes mapped to promotions with usage limits.';



COMMENT ON COLUMN "public"."promotion_coupons"."code" IS 'Human readable coupon code (case insensitive).';



CREATE TABLE IF NOT EXISTS "public"."promotion_usages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "coupon_id" "uuid",
    "order_id" "uuid",
    "user_id" "uuid",
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "applied_actions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_promo_usages_currency_len3" CHECK (("char_length"("currency") = 3))
);


ALTER TABLE "public"."promotion_usages" OWNER TO "postgres";


COMMENT ON TABLE "public"."promotion_usages" IS 'Audit log of which promotions fired for which orders/users.';



COMMENT ON COLUMN "public"."promotion_usages"."context" IS 'Snapshot of cart context (totals, items) when promotion applied.';



COMMENT ON COLUMN "public"."promotion_usages"."applied_actions" IS 'Serialized list of actions executed for this promotion.';



CREATE TABLE IF NOT EXISTS "public"."promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."promotion_status" DEFAULT 'draft'::"public"."promotion_status" NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "combinable" boolean DEFAULT true NOT NULL,
    "stack_group" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promotions_starts_before_ends" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" <= "ends_at")))
);


ALTER TABLE "public"."promotions" OWNER TO "postgres";


COMMENT ON TABLE "public"."promotions" IS 'Marketing promotions configured via admin to drive complex discount scenarios.';



COMMENT ON COLUMN "public"."promotions"."slug" IS 'Stable identifier used by the admin UI and APIs.';



COMMENT ON COLUMN "public"."promotions"."priority" IS 'Lower value = higher priority when promotions compete.';



COMMENT ON COLUMN "public"."promotions"."combinable" IS 'If false, promotion blocks other non-stackable discounts.';



COMMENT ON COLUMN "public"."promotions"."stack_group" IS 'Optional stack group to control mutual exclusions for similar promos.';



COMMENT ON COLUMN "public"."promotions"."metadata" IS 'Arbitrary JSON metadata including default actions/conditions.';



CREATE TABLE IF NOT EXISTS "public"."publish_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target" "text" NOT NULL,
    "action" "text" DEFAULT 'revalidate'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "executed_at" timestamp with time zone,
    "created_by" "uuid",
    CONSTRAINT "publish_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."publish_jobs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_catalog" WITH ("security_invoker"='true') AS
 SELECT "id",
    "slug",
    "title",
    "price",
    "rating",
    "category_slug",
    "created_at",
    "thumbnail_path"
   FROM "public"."catalog_published";


ALTER VIEW "public"."published_catalog" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_content_blocks" WITH ("security_invoker"='true') AS
 SELECT "id",
    "locale",
    "type",
    "slug",
    "content_json",
    "published_at"
   FROM "public"."content_blocks"
  WHERE (("status" = 'published'::"text") AND (("published_at" IS NULL) OR ("published_at" <= "now"())));


ALTER VIEW "public"."published_content_blocks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_media_assets" WITH ("security_invoker"='true') AS
 SELECT "id",
    "bucket",
    "storage_key",
    "mime_type",
    "width",
    "height",
    "size_bytes",
    "alt",
    "description",
    "created_at"
   FROM "public"."media_assets"
  WHERE ("bucket" = 'public-media'::"text");


ALTER VIEW "public"."published_media_assets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_navigation_links" WITH ("security_invoker"='true') AS
 SELECT "id",
    "locale",
    "menu",
    "label",
    "url",
    "sort_order",
    "is_external"
   FROM "public"."navigation_links"
  WHERE ("published" = true)
  ORDER BY "menu", "locale", "sort_order", "label";


ALTER VIEW "public"."published_navigation_links" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_page_sections" WITH ("security_invoker"='true') AS
 SELECT "id",
    "page_path",
    "locale",
    "block_id",
    "sort_order"
   FROM "public"."page_sections" "ps"
  WHERE ((NOT "is_draft") AND "visible" AND (("published_at" IS NULL) OR ("published_at" <= "now"())));


ALTER VIEW "public"."published_page_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "value_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_site_settings" WITH ("security_invoker"='true') AS
 SELECT "key",
    "locale",
    "value_json"
   FROM "public"."site_settings"
  WHERE ("is_public" = true);


ALTER VIEW "public"."published_site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locale" "text" NOT NULL,
    "tkey" "text" NOT NULL,
    "value_text" "text",
    "value_json" "jsonb",
    "namespace" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "ns_norm" "text" GENERATED ALWAYS AS (COALESCE("namespace", ''::"text")) STORED
);


ALTER TABLE "public"."translations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."published_translations" WITH ("security_invoker"='true') AS
 SELECT "locale",
    "tkey",
    COALESCE("value_text", ("value_json")::"text") AS "value",
    "namespace"
   FROM "public"."translations";


ALTER VIEW "public"."published_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recent_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "anon_id" "text",
    "product_id" "uuid" NOT NULL,
    "seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight" real DEFAULT 1 NOT NULL,
    CONSTRAINT "recent_views_owner_chk" CHECK ((("user_id" IS NOT NULL) OR ("anon_id" IS NOT NULL)))
);


ALTER TABLE "public"."recent_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refresh_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "user_agent" "text",
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_reason" "text",
    "updated_at" timestamp with time zone,
    CONSTRAINT "refresh_tokens_expires_check" CHECK (("expires_at" > "created_at"))
);

ALTER TABLE ONLY "public"."refresh_tokens" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."refresh_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_rate_limits" (
    "ip_hash" "text" NOT NULL,
    "last_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count_24h" integer DEFAULT 0 NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."review_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_votes" (
    "product_id" "uuid" NOT NULL,
    "review_author_id" "uuid" NOT NULL,
    "voter_id" "uuid" NOT NULL,
    "value" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_votes_no_self" CHECK (("review_author_id" <> "voter_id")),
    CONSTRAINT "review_votes_value_check" CHECK (("value" = ANY (ARRAY[1, '-1'::integer])))
);


ALTER TABLE "public"."review_votes" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_votes" IS 'Stores useful/not-useful votes for product reviews';



CREATE OR REPLACE VIEW "public"."reviews_unified" WITH ("security_invoker"='true') AS
 SELECT "r"."id" AS "review_id",
    "r"."id",
    "r"."user_id" AS "reviewer_id",
    "r"."product_id" AS "product_uid",
    'public'::"text" AS "source_schema",
    'product_reviews_raw'::"text" AS "source_table",
    ((("r"."product_id")::"text" || ':'::"text") || ("r"."user_id")::"text") AS "source_pk",
    "p"."title" AS "product_title",
    "p"."slug" AS "product_slug",
    "r"."rating",
    "r"."title" AS "review_title",
    "r"."body" AS "review_body",
    "r"."status",
    "r"."created_at"
   FROM ("public"."product_reviews_raw" "r"
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "r"."product_id")));


ALTER VIEW "public"."reviews_unified" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "publish_at" timestamp with time zone NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."scheduled_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_items" (
    "product_id" "uuid" NOT NULL,
    "qty_available" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."stock_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" bigint NOT NULL,
    "order_id" "uuid",
    "order_item_id" "uuid",
    "product_id" "uuid" NOT NULL,
    "qty_delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."stock_movements" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stock_movements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stock_movements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stock_movements_id_seq" OWNED BY "public"."stock_movements"."id";



CREATE TABLE IF NOT EXISTS "public"."stripe_balance_transactions_cache" (
    "id" "text" NOT NULL,
    "amount" bigint,
    "currency" "text",
    "fee" bigint,
    "net" bigint,
    "status" "text",
    "type" "text",
    "created" timestamp with time zone,
    "attrs" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_balance_transactions_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_charges_cache" (
    "id" "text" NOT NULL,
    "customer" "text",
    "amount" bigint,
    "currency" "text",
    "description" "text",
    "invoice" "text",
    "payment_intent" "text",
    "status" "text",
    "created" timestamp without time zone,
    "email" "text",
    "name" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_charges_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_customers_cache" (
    "id" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "description" "text",
    "created" timestamp without time zone,
    "attrs" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_customers_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_products_cache" (
    "id" "text" NOT NULL,
    "name" "text",
    "active" boolean,
    "default_price" "text",
    "description" "text",
    "created" timestamp without time zone,
    "updated" timestamp without time zone,
    "attrs" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "is_public" boolean DEFAULT true
);


ALTER TABLE "public"."stripe_products_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_webhooks" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "livemode" boolean NOT NULL,
    "api_version" "text",
    "created_utc" timestamp with time zone NOT NULL,
    "data" "jsonb" NOT NULL,
    "raw" "jsonb",
    "inserted_at" timestamp with time zone DEFAULT "now"(),
    "mode" "text" GENERATED ALWAYS AS (
CASE
    WHEN "livemode" THEN 'live'::"text"
    ELSE 'test'::"text"
END) STORED,
    "mismatch_reason" "text",
    "expected_amount_cents" integer,
    "expected_currency" "text",
    "stripe_amount_cents" integer,
    "stripe_currency" "text",
    "processing_state" "text",
    "processing_error" "text",
    "notified_succeeded" boolean DEFAULT false NOT NULL,
    "notified_failed" boolean DEFAULT false NOT NULL,
    "notified_refunded" boolean DEFAULT false NOT NULL,
    "notified_desync" boolean DEFAULT false NOT NULL,
    "notified_requires_action" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."stripe_webhooks" OWNER TO "postgres";


CREATE UNLOGGED TABLE "public"."stripe_webhooks_failed" (
    "id" "text" NOT NULL,
    "type" "text",
    "livemode" boolean,
    "api_version" "text",
    "created_utc" timestamp with time zone,
    "data" "jsonb",
    "raw" "jsonb",
    "inserted_at" timestamp with time zone,
    "surrogate_id" bigint NOT NULL
);


ALTER TABLE "public"."stripe_webhooks_failed" OWNER TO "postgres";


CREATE UNLOGGED SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" OWNED BY "public"."stripe_webhooks_failed"."surrogate_id";



CREATE OR REPLACE VIEW "public"."stripe_webhooks_with_mode" WITH ("security_invoker"='on') AS
 SELECT "id",
    "type",
    "livemode",
        CASE
            WHEN "livemode" THEN 'live'::"text"
            ELSE 'test'::"text"
        END AS "mode",
    "created_utc",
    "data"
   FROM "public"."stripe_webhooks";


ALTER VIEW "public"."stripe_webhooks_with_mode" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."title_blacklist" (
    "pattern" "text" NOT NULL
);


ALTER TABLE "public"."title_blacklist" OWNER TO "postgres";


CREATE UNLOGGED TABLE "public"."total_is_generated" (
    "coalesce" boolean,
    "id" bigint NOT NULL
);


ALTER TABLE "public"."total_is_generated" OWNER TO "postgres";


CREATE UNLOGGED SEQUENCE "public"."total_is_generated_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."total_is_generated_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."total_is_generated_id_seq" OWNED BY "public"."total_is_generated"."id";



CREATE OR REPLACE VIEW "public"."v_catalog" WITH ("security_invoker"='true') AS
 SELECT "id",
    "slug",
    "title",
    "price",
    "rating",
    "category_slug",
    "main_image_url",
    "image_path"
   FROM "public"."ecom_products"
  WHERE (("status_lc" = ANY (ARRAY['published'::"text", 'active'::"text"])) AND ("deleted_at" IS NULL));


ALTER VIEW "public"."v_catalog" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_product_images" WITH ("security_invoker"='true') AS
 SELECT "piv"."product_id",
    "piv"."path",
    "piv"."source_url",
    "piv"."metadata"
   FROM ("public"."ecom_product_image_versions" "piv"
     JOIN "public"."ecom_products" "p" ON (("p"."id" = "piv"."product_id")))
  WHERE (("piv"."is_current" = true) AND ("p"."status_lc" = ANY (ARRAY['published'::"text", 'active'::"text"])) AND ("p"."deleted_at" IS NULL));


ALTER VIEW "public"."v_product_images" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."webhook_logs" WITH ("security_invoker"='true') AS
 SELECT "sw"."id",
    "sw"."created_utc" AS "created_at",
    "sw"."type",
    COALESCE("sw"."data", "sw"."raw") AS "payload",
    NULL::"text" AS "event",
    NULL::"text" AS "url",
    NULL::integer AS "status",
    NULL::"jsonb" AS "request_headers",
    NULL::"jsonb" AS "request_body",
    NULL::"jsonb" AS "response_headers",
    NULL::"jsonb" AS "response_body",
    NULL::"text" AS "error",
    NULL::integer AS "duration_ms",
    1 AS "attempt",
    "sw"."id" AS "delivery_id",
    NULL::"text" AS "webhook_id",
    'ok'::"text" AS "source",
        CASE
            WHEN "sw"."livemode" THEN 'live'::"text"
            ELSE 'test'::"text"
        END AS "webhook_mode",
    "sw"."livemode",
    "sw"."api_version",
    "sw"."inserted_at"
   FROM "public"."stripe_webhooks" "sw"
UNION ALL
 SELECT "swf"."id",
    "swf"."created_utc" AS "created_at",
    "swf"."type",
    COALESCE("swf"."data", "swf"."raw") AS "payload",
    NULL::"text" AS "event",
    NULL::"text" AS "url",
    NULL::integer AS "status",
    NULL::"jsonb" AS "request_headers",
    NULL::"jsonb" AS "request_body",
    NULL::"jsonb" AS "response_headers",
    NULL::"jsonb" AS "response_body",
    NULL::"text" AS "error",
    NULL::integer AS "duration_ms",
    1 AS "attempt",
    "swf"."id" AS "delivery_id",
    NULL::"text" AS "webhook_id",
    'failed'::"text" AS "source",
        CASE
            WHEN "swf"."livemode" THEN 'live'::"text"
            ELSE 'test'::"text"
        END AS "webhook_mode",
    "swf"."livemode",
    "swf"."api_version",
    "swf"."inserted_at"
   FROM "public"."stripe_webhooks_failed" "swf";


ALTER VIEW "public"."webhook_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."webhook_logs_app" WITH ("security_invoker"='true') AS
 SELECT "id",
    "created_at",
    "type",
    "payload",
    "event",
    "url",
    "status",
    "request_headers",
    "request_body",
    "response_headers",
    "response_body",
    "error",
    "duration_ms",
    "attempt",
    "delivery_id",
    "webhook_id",
    "source",
    "webhook_mode",
    "livemode",
    "api_version",
    "inserted_at",
    "type" AS "event_type",
    COALESCE("event", "delivery_id", ("payload" ->> 'id'::"text"), (("payload" -> 'data'::"text") ->> 'id'::"text"), ((("payload" -> 'data'::"text") -> 'object'::"text") ->> 'id'::"text")) AS "event_id",
    COALESCE("status", (NULLIF("regexp_replace"(("response_headers" ->> 'status'::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::integer, (NULLIF("regexp_replace"(("response_body" ->> 'status'::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::integer,
        CASE
            WHEN ("error" IS NOT NULL) THEN 500
            ELSE NULL::integer
        END) AS "log_status"
   FROM "public"."webhook_logs";


ALTER VIEW "public"."webhook_logs_app" OWNER TO "postgres";


ALTER TABLE ONLY "public"."job_runs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_runs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."line_total_is_generated" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."line_total_is_generated_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_status_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_status_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stock_movements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_movements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stripe_webhooks_failed" ALTER COLUMN "surrogate_id" SET DEFAULT "nextval"('"public"."stripe_webhooks_failed_surrogate_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."total_is_generated" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."total_is_generated_id_seq"'::"regclass");



ALTER TABLE ONLY "discounts"."Brand"
    ADD CONSTRAINT "Brand_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."CouponRedemption"
    ADD CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."DiscountAssignment"
    ADD CONSTRAINT "DiscountAssignment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."DiscountExclusion"
    ADD CONSTRAINT "DiscountExclusion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."Discount"
    ADD CONSTRAINT "Discount_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "discounts"."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ab_events"
    ADD CONSTRAINT "ab_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_emails"
    ADD CONSTRAINT "admin_emails_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."auth_group"
    ADD CONSTRAINT "auth_group_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" UNIQUE ("group_id", "permission_id");



ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_group"
    ADD CONSTRAINT "auth_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_content_type_id_codename_01ab375a_uniq" UNIQUE ("content_type_id", "codename");



ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_roles"
    ADD CONSTRAINT "auth_roles_pkey" PRIMARY KEY ("role");



ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_user_id_group_id_94350c0c_uniq" UNIQUE ("user_id", "group_id");



ALTER TABLE ONLY "public"."auth_user"
    ADD CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_user_id_permission_id_14a6b632_uniq" UNIQUE ("user_id", "permission_id");



ALTER TABLE ONLY "public"."auth_user"
    ADD CONSTRAINT "auth_user_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."auth_users"
    ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_published"
    ADD CONSTRAINT "catalog_published_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cms_roles"
    ADD CONSTRAINT "cms_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_blocks"
    ADD CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_blocks"
    ADD CONSTRAINT "content_blocks_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."django_content_type"
    ADD CONSTRAINT "django_content_type_app_label_model_76bd3d3b_uniq" UNIQUE ("app_label", "model");



ALTER TABLE ONLY "public"."django_content_type"
    ADD CONSTRAINT "django_content_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."django_migrations"
    ADD CONSTRAINT "django_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."django_session"
    ADD CONSTRAINT "django_session_pkey" PRIMARY KEY ("session_key");



ALTER TABLE ONLY "public"."ecom_categories"
    ADD CONSTRAINT "ecom_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecom_categories"
    ADD CONSTRAINT "ecom_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecom_product_image_versions"
    ADD CONSTRAINT "ecom_product_image_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecom_wishlist"
    ADD CONSTRAINT "ecom_wishlist_pkey" PRIMARY KEY ("user_id", "product_id");



ALTER TABLE ONLY "public"."feature_toggles"
    ADD CONSTRAINT "feature_toggles_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."form_entries"
    ADD CONSTRAINT "form_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."job_runs"
    ADD CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_total_is_generated"
    ADD CONSTRAINT "line_total_is_generated_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_bucket_storage_key_key" UNIQUE ("bucket", "storage_key");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navigation_links"
    ADD CONSTRAINT "navigation_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_clicks"
    ADD CONSTRAINT "offer_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_audit"
    ADD CONSTRAINT "order_status_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders_archive_export"
    ADD CONSTRAINT "orders_archive_export_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders_archive"
    ADD CONSTRAINT "orders_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_events"
    ADD CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."product_impressions"
    ADD CONSTRAINT "product_impressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_rating_stats"
    ADD CONSTRAINT "product_rating_stats_pkey" PRIMARY KEY ("product_uid");



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews_raw"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("product_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."promotion_actions"
    ADD CONSTRAINT "promotion_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_conditions"
    ADD CONSTRAINT "promotion_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_coupons"
    ADD CONSTRAINT "promotion_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_usages"
    ADD CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."publish_jobs"
    ADD CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recent_views"
    ADD CONSTRAINT "recent_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."review_rate_limits"
    ADD CONSTRAINT "review_rate_limits_pkey" PRIMARY KEY ("ip_hash");



ALTER TABLE ONLY "public"."review_votes"
    ADD CONSTRAINT "review_votes_pk" PRIMARY KEY ("product_id", "review_author_id", "voter_id");



ALTER TABLE ONLY "public"."scheduled_content"
    ADD CONSTRAINT "scheduled_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_clicks"
    ADD CONSTRAINT "shop_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_impressions"
    ADD CONSTRAINT "shop_impressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key", "locale");



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_balance_transactions_cache"
    ADD CONSTRAINT "stripe_balance_transactions_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_charges_cache"
    ADD CONSTRAINT "stripe_charges_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_customers_cache"
    ADD CONSTRAINT "stripe_customers_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_products_cache"
    ADD CONSTRAINT "stripe_products_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhooks_failed"
    ADD CONSTRAINT "stripe_webhooks_failed_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."stripe_webhooks_failed"
    ADD CONSTRAINT "stripe_webhooks_failed_pkey" PRIMARY KEY ("surrogate_id");



ALTER TABLE ONLY "public"."stripe_webhooks"
    ADD CONSTRAINT "stripe_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."title_blacklist"
    ADD CONSTRAINT "title_blacklist_pkey" PRIMARY KEY ("pattern");



ALTER TABLE ONLY "public"."total_is_generated"
    ADD CONSTRAINT "total_is_generated_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_published"
    ADD CONSTRAINT "uq_catalog_published_slug" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "uq_ecom_products_sku" UNIQUE ("sku");



ALTER TABLE ONLY "public"."promotion_coupons"
    ADD CONSTRAINT "uq_promotion_coupons_code" UNIQUE ("code");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "uq_translations_locale_key_ns" UNIQUE ("locale", "tkey", "ns_norm");



CREATE UNIQUE INDEX "Brand_name_key" ON "discounts"."Brand" USING "btree" ("name");



CREATE UNIQUE INDEX "Category_name_key" ON "discounts"."Category" USING "btree" ("name");



CREATE INDEX "CouponRedemption_couponId_redeemedAt_idx" ON "discounts"."CouponRedemption" USING "btree" ("couponId", "redeemedAt");



CREATE INDEX "CouponRedemption_discountId_redeemedAt_idx" ON "discounts"."CouponRedemption" USING "btree" ("discountId", "redeemedAt");



CREATE INDEX "CouponRedemption_userId_couponId_idx" ON "discounts"."CouponRedemption" USING "btree" ("userId", "couponId");



CREATE UNIQUE INDEX "Coupon_code_key" ON "discounts"."Coupon" USING "btree" ("code");



CREATE INDEX "Coupon_discountId_idx" ON "discounts"."Coupon" USING "btree" ("discountId");



CREATE INDEX "Coupon_startsAt_endsAt_idx" ON "discounts"."Coupon" USING "btree" ("startsAt", "endsAt");



CREATE UNIQUE INDEX "DiscountAssignment_discountId_scope_refId_key" ON "discounts"."DiscountAssignment" USING "btree" ("discountId", "scope", "refId");



CREATE INDEX "DiscountAssignment_scope_refId_idx" ON "discounts"."DiscountAssignment" USING "btree" ("scope", "refId");



CREATE UNIQUE INDEX "DiscountExclusion_discountId_scope_refId_key" ON "discounts"."DiscountExclusion" USING "btree" ("discountId", "scope", "refId");



CREATE INDEX "DiscountExclusion_scope_refId_idx" ON "discounts"."DiscountExclusion" USING "btree" ("scope", "refId");



CREATE INDEX "Discount_active_startAt_endAt_channel_idx" ON "discounts"."Discount" USING "btree" ("active", "startAt", "endAt", "channel");



CREATE INDEX "Discount_priority_startAt_idx" ON "discounts"."Discount" USING "btree" ("priority", "startAt");



CREATE INDEX "Product_brandId_idx" ON "discounts"."Product" USING "btree" ("brandId");



CREATE INDEX "Product_categoryId_idx" ON "discounts"."Product" USING "btree" ("categoryId");



CREATE UNIQUE INDEX "Product_sku_key" ON "discounts"."Product" USING "btree" ("sku");



CREATE INDEX "Product_vendorId_idx" ON "discounts"."Product" USING "btree" ("vendorId");



CREATE UNIQUE INDEX "Vendor_name_key" ON "discounts"."Vendor" USING "btree" ("name");



CREATE INDEX "idx_product_name_trgm" ON "discounts"."Product" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_product_sku" ON "discounts"."Product" USING "btree" ("sku");



CREATE INDEX "idx_product_updated_at" ON "discounts"."Product" USING "btree" ("updatedAt");



CREATE INDEX "ab_events_event_idx" ON "public"."ab_events" USING "btree" ("event");



CREATE INDEX "ab_events_test_ts_idx" ON "public"."ab_events" USING "btree" ("test", "ts" DESC);



CREATE INDEX "auth_group_name_a6ea08ec_like" ON "public"."auth_group" USING "btree" ("name" "varchar_pattern_ops");



CREATE INDEX "auth_group_permissions_group_id_b120cbf9" ON "public"."auth_group_permissions" USING "btree" ("group_id");



CREATE INDEX "auth_group_permissions_permission_id_84c5c92e" ON "public"."auth_group_permissions" USING "btree" ("permission_id");



CREATE INDEX "auth_permission_content_type_id_2f476e4b" ON "public"."auth_permission" USING "btree" ("content_type_id");



CREATE INDEX "auth_user_groups_group_id_97559544" ON "public"."auth_user_groups" USING "btree" ("group_id");



CREATE INDEX "auth_user_groups_user_id_6a12ed8b" ON "public"."auth_user_groups" USING "btree" ("user_id");



CREATE INDEX "auth_user_user_permissions_permission_id_1fbb5f2c" ON "public"."auth_user_user_permissions" USING "btree" ("permission_id");



CREATE INDEX "auth_user_user_permissions_user_id_a95ead1b" ON "public"."auth_user_user_permissions" USING "btree" ("user_id");



CREATE INDEX "auth_user_username_6821ab7c_like" ON "public"."auth_user" USING "btree" ("username" "varchar_pattern_ops");



CREATE INDEX "banners_active_window_idx" ON "public"."banners" USING "btree" ("is_active", "active_from", "active_to");



CREATE INDEX "banners_priority_idx" ON "public"."banners" USING "btree" ("priority" DESC, "id" DESC) WHERE ("is_active" = true);



CREATE INDEX "brin_shop_clicks_created_at" ON "public"."shop_clicks" USING "brin" ("created_at") WITH ("pages_per_range"='128');



CREATE INDEX "brin_shop_impressions_created_at" ON "public"."shop_impressions" USING "brin" ("created_at") WITH ("pages_per_range"='128');



CREATE INDEX "catalog_mv_cat_created" ON "public"."catalog_mv" USING "btree" ("category_slug", "created_at" DESC);



CREATE INDEX "catalog_mv_created" ON "public"."catalog_mv" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "catalog_mv_uidx" ON "public"."catalog_mv" USING "btree" ("id");



CREATE INDEX "django_admin_log_content_type_id_c4bce8eb" ON "public"."django_admin_log" USING "btree" ("content_type_id");



CREATE INDEX "django_admin_log_user_id_c564eba6" ON "public"."django_admin_log" USING "btree" ("user_id");



CREATE INDEX "django_session_expire_date_a5c62663" ON "public"."django_session" USING "btree" ("expire_date");



CREATE INDEX "django_session_session_key_c0390e0f_like" ON "public"."django_session" USING "btree" ("session_key" "varchar_pattern_ops");



CREATE INDEX "ecom_piv_product_created_idx" ON "public"."ecom_product_image_versions" USING "btree" ("product_id", "uploaded_at" DESC);



CREATE INDEX "ecom_products_category_idx" ON "public"."ecom_products" USING "btree" ("category_slug");



CREATE INDEX "ecom_products_price_idx" ON "public"."ecom_products" USING "btree" ("price");



CREATE INDEX "ecom_products_rating_idx" ON "public"."ecom_products" USING "btree" ("rating");



CREATE INDEX "ecom_products_search_idx" ON "public"."ecom_products" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("short_desc", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "ecom_products_slug_idx" ON "public"."ecom_products" USING "btree" ("slug");



CREATE INDEX "ecom_products_slug_trgm" ON "public"."ecom_products" USING "gin" ("slug" "extensions"."gin_trgm_ops");



CREATE INDEX "ecom_products_status_idx" ON "public"."ecom_products" USING "btree" ("status");



CREATE INDEX "ecom_products_title_trgm" ON "public"."ecom_products" USING "gin" ("title" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_auth_users_is_active" ON "public"."auth_users" USING "btree" ("is_active");



CREATE INDEX "idx_auth_users_metadata_gin" ON "public"."auth_users" USING "gin" ("metadata");



CREATE INDEX "idx_auth_users_role" ON "public"."auth_users" USING "btree" ("role");



CREATE INDEX "idx_auth_users_token_ver" ON "public"."auth_users" USING "btree" ("token_version");



CREATE INDEX "idx_carts_user" ON "public"."carts" USING "btree" ("user_id");



CREATE INDEX "idx_catpub_cat_created" ON "public"."catalog_published" USING "btree" ("category_slug", "created_at" DESC);



CREATE INDEX "idx_catpub_category" ON "public"."catalog_published" USING "btree" ("category_slug");



CREATE INDEX "idx_catpub_created_desc" ON "public"."catalog_published" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_catpub_price" ON "public"."catalog_published" USING "btree" ("price");



CREATE INDEX "idx_catpub_rating" ON "public"."catalog_published" USING "btree" ("rating");



CREATE INDEX "idx_catpub_title_trgm" ON "public"."catalog_published" USING "gin" ("title" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_cms_roles_role" ON "public"."cms_roles" USING "btree" ("role");



CREATE INDEX "idx_content_blocks_locale_status" ON "public"."content_blocks" USING "btree" ("locale", "status");



CREATE INDEX "idx_ecom_img_versions_pid_uploaddesc_inc" ON "public"."ecom_product_image_versions" USING "btree" ("product_id", "uploaded_at" DESC) INCLUDE ("id", "path", "metadata");



CREATE INDEX "idx_ecom_product_image_versions_product_id" ON "public"."ecom_product_image_versions" USING "btree" ("product_id");



CREATE INDEX "idx_ecom_products_category_created_at" ON "public"."ecom_products" USING "btree" ("category_slug", "created_at" DESC);



CREATE INDEX "idx_ecom_products_category_slug" ON "public"."ecom_products" USING "btree" ("category_slug");



CREATE INDEX "idx_ecom_products_category_status_created" ON "public"."ecom_products" USING "btree" ("category_slug", "status", "created_at" DESC);



CREATE INDEX "idx_ecom_products_seller" ON "public"."ecom_products" USING "btree" ("seller_id");



CREATE INDEX "idx_ecom_products_seller_status_created" ON "public"."ecom_products" USING "btree" ("seller_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "idx_ecom_products_slug" ON "public"."ecom_products" USING "btree" ("slug");



CREATE INDEX "idx_ecom_products_specs_brand" ON "public"."ecom_products" USING "btree" ((("specs" ->> 'brand'::"text")));



CREATE INDEX "idx_ecom_products_specs_gin" ON "public"."ecom_products" USING "gin" ("specs");



CREATE INDEX "idx_ecom_products_status_created_at" ON "public"."ecom_products" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_ecom_products_status_price" ON "public"."ecom_products" USING "btree" ("status", "price");



CREATE INDEX "idx_ecom_products_tags_gin" ON "public"."ecom_products" USING "gin" ("tags");



CREATE INDEX "idx_ecom_products_title_trgm" ON "public"."ecom_products" USING "gin" ("title" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_epiv_product_current" ON "public"."ecom_product_image_versions" USING "btree" ("product_id", "is_current");



CREATE INDEX "idx_form_entries_form" ON "public"."form_entries" USING "btree" ("form_id", "submitted_at");



CREATE INDEX "idx_media_bucket_key" ON "public"."media_assets" USING "btree" ("bucket", "storage_key");



CREATE INDEX "idx_nav_links_menu_locale" ON "public"."navigation_links" USING "btree" ("menu", "locale");



CREATE INDEX "idx_nav_links_published_sort" ON "public"."navigation_links" USING "btree" ("published", "sort_order");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_status_history_order" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_order_status_history_order_id" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_orders_amount_created" ON "public"."orders" USING "btree" ("grand_total" DESC, "created_at" DESC);



CREATE INDEX "idx_orders_archive_amount_created" ON "public"."orders_archive" USING "btree" ("grand_total" DESC, "created_at" DESC);



CREATE INDEX "idx_orders_archive_created_at" ON "public"."orders_archive" USING "btree" ("created_at");



CREATE INDEX "idx_orders_archive_created_id" ON "public"."orders_archive" USING "btree" ("created_at" DESC, "id" DESC);



CREATE INDEX "idx_orders_archive_export_created_at" ON "public"."orders_archive_export" USING "btree" ("created_at");



CREATE INDEX "idx_orders_archive_run_id" ON "public"."orders_archive" USING "btree" ("archive_run_id");



CREATE INDEX "idx_orders_archive_status" ON "public"."orders_archive" USING "btree" ("status");



CREATE INDEX "idx_orders_archive_user_created" ON "public"."orders_archive" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_orders_archive_user_id" ON "public"."orders_archive" USING "btree" ("user_id");



CREATE INDEX "idx_orders_created_id" ON "public"."orders" USING "btree" ("created_at" DESC, "id" DESC);



CREATE UNIQUE INDEX "idx_orders_payment_intent_unique" ON "public"."orders" USING "btree" (TRIM(BOTH FROM "payment_intent_id")) WHERE (("payment_intent_id" IS NOT NULL) AND (TRIM(BOTH FROM "payment_intent_id") <> ''::"text"));



CREATE INDEX "idx_orders_user_created" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_orders_user_created_at" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_orders_user_id_created_at" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_page_sections_key" ON "public"."page_sections" USING "btree" ("page_path", "locale", "sort_order");



CREATE INDEX "idx_payments_order" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_product_impressions_prod_created" ON "public"."product_impressions" USING "btree" ("product_id", "created_at");



CREATE INDEX "idx_product_impressions_product" ON "public"."product_impressions" USING "btree" ("product_id");



CREATE INDEX "idx_product_impressions_product_created" ON "public"."product_impressions" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "idx_product_impressions_product_id" ON "public"."product_impressions" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_raw_user_id" ON "public"."product_reviews_raw" USING "btree" ("user_id");



CREATE INDEX "idx_promo_usages_order" ON "public"."promotion_usages" USING "btree" ("order_id");



CREATE INDEX "idx_promo_usages_promotion" ON "public"."promotion_usages" USING "btree" ("promotion_id");



CREATE INDEX "idx_promo_usages_user" ON "public"."promotion_usages" USING "btree" ("user_id");



CREATE INDEX "idx_publish_jobs_status" ON "public"."publish_jobs" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_recent_views_product" ON "public"."recent_views" USING "btree" ("product_id");



CREATE INDEX "idx_recent_views_user_seen" ON "public"."recent_views" USING "btree" ("user_id", "seen_at");



CREATE INDEX "idx_refresh_tokens_user" ON "public"."refresh_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_refresh_tokens_user_exp" ON "public"."refresh_tokens" USING "btree" ("user_id", "expires_at");



CREATE INDEX "idx_review_msgs_author_created" ON "public"."product_review_messages" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "idx_review_msgs_prod_created" ON "public"."product_review_messages" USING "btree" ("product_id", "created_at");



CREATE INDEX "idx_review_msgs_prod_created_desc" ON "public"."product_review_messages" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "idx_review_msgs_raw_id" ON "public"."product_review_messages" USING "btree" ("review_raw_id");



CREATE INDEX "idx_reviews_product" ON "public"."product_reviews_raw" USING "btree" ("product_id", "status", "created_at" DESC);



CREATE INDEX "idx_reviews_product_status" ON "public"."product_reviews_raw" USING "btree" ("product_id", "status");



CREATE INDEX "idx_reviews_raw_product" ON "public"."product_reviews_raw" USING "btree" ("product_id");



CREATE INDEX "idx_reviews_raw_user" ON "public"."product_reviews_raw" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_sort_rating" ON "public"."product_reviews_raw" USING "btree" ("product_id", "status", "rating" DESC, "created_at" DESC);



CREATE INDEX "idx_scheduled_content_time" ON "public"."scheduled_content" USING "btree" ("publish_at");



CREATE INDEX "idx_shop_clicks_created_at" ON "public"."shop_clicks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_shop_clicks_dedupe" ON "public"."shop_clicks" USING "btree" ("product_id", "session_id", "referrer", "created_at" DESC);



CREATE INDEX "idx_shop_clicks_prod_created" ON "public"."shop_clicks" USING "btree" ("product_id", "created_at");



CREATE INDEX "idx_shop_clicks_product_id" ON "public"."shop_clicks" USING "btree" ("product_id");



CREATE INDEX "idx_shop_clicks_referrer_created_at" ON "public"."shop_clicks" USING "btree" ("referrer", "created_at" DESC);



CREATE INDEX "idx_shop_impressions_created_at" ON "public"."shop_impressions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_shop_impressions_dedupe" ON "public"."shop_impressions" USING "btree" ("product_id", "session_id", "referrer", "created_at" DESC);



CREATE INDEX "idx_shop_impressions_prod_created" ON "public"."shop_impressions" USING "btree" ("product_id", "created_at");



CREATE INDEX "idx_shop_impressions_product_created" ON "public"."shop_impressions" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "idx_shop_impressions_product_id" ON "public"."shop_impressions" USING "btree" ("product_id");



CREATE INDEX "idx_shop_impressions_referrer_created_at" ON "public"."shop_impressions" USING "btree" ("referrer", "created_at" DESC);



CREATE INDEX "idx_site_settings_locale" ON "public"."site_settings" USING "btree" ("locale");



CREATE INDEX "idx_sw_created" ON "public"."stripe_webhooks" USING "btree" ("created_utc");



CREATE INDEX "idx_wishlist_user_created" ON "public"."ecom_wishlist" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "ix_co_viewed_score" ON "public"."co_viewed_mv" USING "btree" ("score" DESC);



CREATE INDEX "ix_payments_status_created" ON "public"."payments" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "ix_prm_author" ON "public"."product_review_messages" USING "btree" ("author_id");



CREATE INDEX "ix_prm_parent" ON "public"."product_review_messages" USING "btree" ("parent_id");



CREATE INDEX "ix_prm_product" ON "public"."product_review_messages" USING "btree" ("product_id");



CREATE INDEX "ix_prm_root" ON "public"."product_review_messages" USING "btree" ("root_review_id");



CREATE INDEX "ix_prm_root_created" ON "public"."product_review_messages" USING "btree" ("root_review_id", "created_at");



CREATE INDEX "ix_recent_anon_seen_at" ON "public"."recent_views" USING "btree" ("anon_id", "seen_at" DESC);



CREATE INDEX "ix_recent_product" ON "public"."recent_views" USING "btree" ("product_id");



CREATE INDEX "ix_recent_user_seen_at" ON "public"."recent_views" USING "btree" ("user_id", "seen_at" DESC);



CREATE INDEX "ix_visible" ON "public"."ecom_products" USING "btree" ("status_lc", "to_delete") WHERE ("status_lc" = ANY (ARRAY['active'::"text", 'published'::"text"]));



CREATE INDEX "offer_clicks_slug_created_idx" ON "public"."offer_clicks" USING "btree" ("slug", "created_at" DESC);



CREATE UNIQUE INDEX "order_items_uniq" ON "public"."order_items" USING "btree" ("order_id", "product_id");



CREATE INDEX "order_status_audit_changed_at_idx" ON "public"."order_status_audit" USING "btree" ("changed_at");



CREATE INDEX "order_status_audit_order_id_idx" ON "public"."order_status_audit" USING "btree" ("order_id");



CREATE INDEX "order_status_history_order_created_idx" ON "public"."order_status_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "orders_created_at_brin" ON "public"."orders" USING "brin" ("created_at");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "orders_payment_intent_id_idx" ON "public"."orders" USING "btree" ("payment_intent_id");



CREATE INDEX "orders_payment_status_idx" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "orders_pending_idx" ON "public"."orders" USING "btree" ("user_id") WHERE ("status" = 'pending'::"public"."order_status");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "orders_status_paid_paid_at_idx" ON "public"."orders" USING "btree" ("paid_at" DESC) WHERE (("status" = 'paid'::"public"."order_status") AND ("paid_at" IS NOT NULL));



CREATE INDEX "orders_user_status_created_idx" ON "public"."orders" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "payments_order_created_idx" ON "public"."payments" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "payments_provider_ref_idx" ON "public"."payments" USING "btree" ("provider_ref");



CREATE INDEX "product_impressions_created_idx" ON "public"."product_impressions" USING "btree" ("created_at" DESC);



CREATE INDEX "product_impressions_product_created_idx" ON "public"."product_impressions" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "product_impressions_product_idx" ON "public"."product_impressions" USING "btree" ("product_id");



CREATE INDEX "product_impressions_slug_idx" ON "public"."product_impressions" USING "btree" ("slug");



CREATE INDEX "promotion_conditions_promotion_idx" ON "public"."promotion_conditions" USING "btree" ("promotion_id", "kind");



CREATE UNIQUE INDEX "promotion_coupons_code_unique" ON "public"."promotion_coupons" USING "btree" ("lower"("code"));



CREATE INDEX "promotion_usages_coupon_idx" ON "public"."promotion_usages" USING "btree" ("coupon_id", "user_id");



CREATE INDEX "promotion_usages_promotion_idx" ON "public"."promotion_usages" USING "btree" ("promotion_id", "created_at" DESC);



CREATE INDEX "review_votes_product_idx" ON "public"."review_votes" USING "btree" ("product_id", "review_author_id");



CREATE INDEX "shop_clicks_product_created_idx" ON "public"."shop_clicks" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "shop_impressions_product_created_idx" ON "public"."shop_impressions" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "stock_movements_order_idx" ON "public"."stock_movements" USING "btree" ("order_id");



CREATE INDEX "stock_movements_product_idx" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "stripe_webhooks_created_idx" ON "public"."stripe_webhooks" USING "btree" ("created_utc" DESC);



CREATE INDEX "stripe_webhooks_failed_created_brin" ON "public"."stripe_webhooks_failed" USING "brin" ("created_utc");



CREATE INDEX "stripe_webhooks_failed_created_idx" ON "public"."stripe_webhooks_failed" USING "btree" ("created_utc");



CREATE INDEX "stripe_webhooks_type_idx" ON "public"."stripe_webhooks" USING "btree" ("type");



CREATE UNIQUE INDEX "uq_co_viewed" ON "public"."co_viewed_mv" USING "btree" ("product_a", "product_b");



CREATE UNIQUE INDEX "uq_product_reviews_raw_id" ON "public"."product_reviews_raw" USING "btree" ("id");



CREATE UNIQUE INDEX "uq_recent_by_anon" ON "public"."recent_views" USING "btree" ("anon_id", "product_id") WHERE ("anon_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_recent_by_user" ON "public"."recent_views" USING "btree" ("user_id", "product_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_slug_visible" ON "public"."ecom_products" USING "btree" ("lower"("slug")) WHERE ((COALESCE("to_delete", false) = false) AND ("status_lc" = ANY (ARRAY['active'::"text", 'published'::"text"])));



CREATE OR REPLACE TRIGGER "trg_product_updated_at" BEFORE UPDATE ON "discounts"."Product" FOR EACH ROW EXECUTE FUNCTION "discounts"."set_updated_at"();



CREATE OR REPLACE TRIGGER "_upd" BEFORE UPDATE ON "public"."stripe_products_cache" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ecomp_set_status_on_insert" BEFORE INSERT ON "public"."ecom_products" FOR EACH ROW EXECUTE FUNCTION "public"."ecomp_set_status_on_insert"();



CREATE OR REPLACE TRIGGER "orders_block_zero" BEFORE INSERT OR UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_block_zero"();



CREATE OR REPLACE TRIGGER "orders_forbid_cancel_if_paid" BEFORE UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_forbid_cancel_if_paid"();



CREATE OR REPLACE TRIGGER "orders_guard_refund" BEFORE UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_guard_refund"();



CREATE OR REPLACE TRIGGER "orders_inventory_trg" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."trg_orders_inventory"();



CREATE OR REPLACE TRIGGER "orders_log_status" AFTER INSERT OR UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_log_status"();



CREATE OR REPLACE TRIGGER "orders_status_audit_trg" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."trg_orders_status_audit"();



CREATE OR REPLACE TRIGGER "orders_validate_status" BEFORE UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_validate_status"();



CREATE OR REPLACE TRIGGER "payments_sync_order" AFTER INSERT OR UPDATE OF "status" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_payments_sync_order"();



CREATE OR REPLACE TRIGGER "payments_sync_order_on_success" AFTER INSERT OR UPDATE OF "status" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_on_payment"();



CREATE OR REPLACE TRIGGER "prm_before_insert_self_root" BEFORE INSERT ON "public"."product_review_messages" FOR EACH ROW EXECUTE FUNCTION "public"."prm_before_insert"();



CREATE OR REPLACE TRIGGER "prm_depth_guard_trg" BEFORE INSERT OR UPDATE ON "public"."product_review_messages" FOR EACH ROW EXECUTE FUNCTION "public"."prm_depth_guard"();



CREATE OR REPLACE TRIGGER "prm_set_updated_at" BEFORE UPDATE ON "public"."product_review_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_sync_ecom_iod" INSTEAD OF DELETE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ecom_products_from_products"();



CREATE OR REPLACE TRIGGER "products_sync_ecom_ioi" INSTEAD OF INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ecom_products_from_products"();



CREATE OR REPLACE TRIGGER "products_sync_ecom_iou" INSTEAD OF UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ecom_products_from_products"();



CREATE OR REPLACE TRIGGER "reject_profanity_order_items" BEFORE INSERT OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reject_profanity"();



CREATE OR REPLACE TRIGGER "reviews_unified_del" INSTEAD OF DELETE ON "public"."reviews_unified" FOR EACH ROW EXECUTE FUNCTION "public"."reviews_unified_instead"();



CREATE OR REPLACE TRIGGER "reviews_unified_ins" INSTEAD OF INSERT ON "public"."reviews_unified" FOR EACH ROW EXECUTE FUNCTION "public"."reviews_unified_instead"();



CREATE OR REPLACE TRIGGER "reviews_unified_upd" INSTEAD OF UPDATE ON "public"."reviews_unified" FOR EACH ROW EXECUTE FUNCTION "public"."reviews_unified_instead"();



CREATE OR REPLACE TRIGGER "stripe_webhooks_sync_order" AFTER INSERT ON "public"."stripe_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_on_webhook"();



CREATE OR REPLACE TRIGGER "tr_product_impressions_resolve_pid" BEFORE INSERT OR UPDATE ON "public"."product_impressions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_resolve_impression_pid"();



CREATE OR REPLACE TRIGGER "trg_app_settings_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_auth_users_set_updated_at" BEFORE UPDATE ON "public"."auth_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_banners_set_updated_at" BEFORE UPDATE ON "public"."banners" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ecom_products_soft_delete_sync" BEFORE INSERT OR UPDATE ON "public"."ecom_products" FOR EACH ROW EXECUTE FUNCTION "public"."ecom_products_soft_delete_sync"();



CREATE OR REPLACE TRIGGER "trg_order_items_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."tr_recalc_after_order_items"();



CREATE OR REPLACE TRIGGER "trg_order_items_total_biu" BEFORE INSERT OR UPDATE OF "qty", "unit_price" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."fn_order_items_total_sync"();



CREATE OR REPLACE TRIGGER "trg_orders_currency_upper" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."currency_upper"();



CREATE OR REPLACE TRIGGER "trg_orders_enforce_owner" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."orders_enforce_owner"();



CREATE OR REPLACE TRIGGER "trg_orders_normalize_currency" BEFORE INSERT OR UPDATE OF "currency" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_normalize_currency"();



CREATE OR REPLACE TRIGGER "trg_orders_recalc" AFTER UPDATE OF "discount_total", "shipping_total" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tr_recalc_after_orders"();



CREATE OR REPLACE TRIGGER "trg_orders_set_user_id" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."orders_set_user_id"();



CREATE OR REPLACE TRIGGER "trg_orders_status_guard" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."orders_status_guard"();



CREATE OR REPLACE TRIGGER "trg_payments_status_propagate" AFTER UPDATE OF "status" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."tr_payments_status_propagate"();



CREATE OR REPLACE TRIGGER "trg_product_reviews_updated_at" BEFORE UPDATE ON "public"."product_reviews_raw" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_promotion_coupons_updated_at" BEFORE UPDATE ON "public"."promotion_coupons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_promotions_updated_at" BEFORE UPDATE ON "public"."promotions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prw_after_delete" AFTER DELETE ON "public"."product_reviews_raw" FOR EACH ROW EXECUTE FUNCTION "public"."recalc_product_rating_wrap_old"();



CREATE OR REPLACE TRIGGER "trg_prw_after_insert" AFTER INSERT ON "public"."product_reviews_raw" FOR EACH ROW EXECUTE FUNCTION "public"."recalc_product_rating_wrap_new"();



CREATE OR REPLACE TRIGGER "trg_prw_after_update" AFTER UPDATE OF "rating", "status" ON "public"."product_reviews_raw" FOR EACH ROW EXECUTE FUNCTION "public"."recalc_product_rating_wrap_new"();



CREATE OR REPLACE TRIGGER "trg_reject_bad_titles_ecom" BEFORE INSERT OR UPDATE ON "public"."ecom_products" FOR EACH ROW EXECUTE FUNCTION "public"."reject_bad_titles"();



CREATE OR REPLACE TRIGGER "trg_rev_content_blocks" AFTER INSERT OR DELETE OR UPDATE ON "public"."content_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."tf_rev_content_blocks"();



CREATE OR REPLACE TRIGGER "trg_rev_navigation_links" AFTER INSERT OR DELETE OR UPDATE ON "public"."navigation_links" FOR EACH ROW EXECUTE FUNCTION "public"."tf_rev_navigation_links"();



CREATE OR REPLACE TRIGGER "trg_rev_page_sections" AFTER INSERT OR DELETE OR UPDATE ON "public"."page_sections" FOR EACH ROW EXECUTE FUNCTION "public"."tf_rev_page_sections"();



CREATE OR REPLACE TRIGGER "trg_rev_site_settings" AFTER INSERT OR DELETE OR UPDATE ON "public"."site_settings" FOR EACH ROW EXECUTE FUNCTION "public"."tf_rev_site_settings"();



CREATE OR REPLACE TRIGGER "validate_item_money" BEFORE INSERT OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_item_money"();



ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "public"."auth_permission"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "public"."auth_group"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_content_type_id_2f476e4b_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "public"."django_content_type"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_group_id_97559544_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "public"."auth_group"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_user_id_6a12ed8b_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "public"."auth_permission"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_roles"
    ADD CONSTRAINT "cms_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_blocks"
    ADD CONSTRAINT "content_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."content_blocks"
    ADD CONSTRAINT "content_blocks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_author_fkey" FOREIGN KEY ("author") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_content_type_id_c4bce8eb_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "public"."django_content_type"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_user_id_c564eba6_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."ecom_product_image_versions"
    ADD CONSTRAINT "ecom_product_image_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_category_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "public"."ecom_categories"("slug") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecom_wishlist"
    ADD CONSTRAINT "ecom_wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecom_wishlist"
    ADD CONSTRAINT "ecom_wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_toggles"
    ADD CONSTRAINT "feature_toggles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "fk_ecom_products_currency" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_currency" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_usages"
    ADD CONSTRAINT "fk_promo_usages_currency" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."form_entries"
    ADD CONSTRAINT "form_entries_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."form_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_entries"
    ADD CONSTRAINT "form_entries_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."navigation_links"
    ADD CONSTRAINT "navigation_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."navigation_links"
    ADD CONSTRAINT "navigation_links_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navigation_links"
    ADD CONSTRAINT "navigation_links_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id");



ALTER TABLE ONLY "public"."order_status_audit"
    ADD CONSTRAINT "order_status_audit_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."content_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_impressions"
    ADD CONSTRAINT "product_impressions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."product_rating_stats"
    ADD CONSTRAINT "product_rating_stats_product_uid_fkey" FOREIGN KEY ("product_uid") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_author_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."product_review_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_raw_fk" FOREIGN KEY ("review_raw_id") REFERENCES "public"."product_reviews_raw"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_review_messages"
    ADD CONSTRAINT "product_review_messages_root_fk" FOREIGN KEY ("root_review_id") REFERENCES "public"."product_review_messages"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."product_reviews_raw"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews_raw"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."promotion_actions"
    ADD CONSTRAINT "promotion_actions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_conditions"
    ADD CONSTRAINT "promotion_conditions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_coupons"
    ADD CONSTRAINT "promotion_coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promotion_usages"
    ADD CONSTRAINT "promotion_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."promotion_coupons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promotion_usages"
    ADD CONSTRAINT "promotion_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promotion_usages"
    ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."publish_jobs"
    ADD CONSTRAINT "publish_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."recent_views"
    ADD CONSTRAINT "recent_views_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_content"
    ADD CONSTRAINT "scheduled_content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shop_clicks"
    ADD CONSTRAINT "shop_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_impressions"
    ADD CONSTRAINT "shop_impressions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can insert offer clicks" ON "public"."offer_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert product impressions" ON "public"."product_impressions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert shop clicks" ON "public"."shop_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert shop impressions" ON "public"."shop_impressions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can submit contact message" ON "public"."contact_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public read ecom product image versions" ON "public"."ecom_product_image_versions" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."ab_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_select" ON "public"."ecom_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "anon_select" ON "public"."ecom_product_image_versions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "anon_select" ON "public"."product_rating_stats" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth can read title_blacklist" ON "public"."title_blacklist" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."auth_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_group_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_permission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_user_user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bal_tx_deny_client_write" ON "public"."stripe_balance_transactions_cache" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "bal_tx_read_auth" ON "public"."stripe_balance_transactions_cache" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "banners_delete_admin" ON "public"."banners" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text")))));



CREATE POLICY "banners_insert_cms" ON "public"."banners" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "banners_read_active" ON "public"."banners" FOR SELECT USING (("is_active" AND (("active_from" IS NULL) OR ("active_from" <= "now"())) AND (("active_to" IS NULL) OR ("active_to" >= "now"()))));



CREATE POLICY "banners_update_cms" ON "public"."banners" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "blocks_delete_cms" ON "public"."content_blocks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "blocks_insert_cms" ON "public"."content_blocks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "blocks_update_cms" ON "public"."content_blocks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carts_owner_all" ON "public"."carts" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "carts_owner_del" ON "public"."carts" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "carts_owner_ins" ON "public"."carts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "carts_owner_insert" ON "public"."carts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "carts_owner_read" ON "public"."carts" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "carts_owner_select" ON "public"."carts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "carts_owner_upd" ON "public"."carts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "carts_owner_update" ON "public"."carts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."catalog_published" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_published_editor_all" ON "public"."catalog_published" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "catalog_published_public_read" ON "public"."catalog_published" FOR SELECT USING (true);



CREATE POLICY "charges_deny_client_write" ON "public"."stripe_charges_cache" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "charges_read_auth" ON "public"."stripe_charges_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "clicks_insert_any" ON "public"."shop_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "cms_admin_editor_all" ON "public"."cms_roles" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."content_blocks" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."content_revisions" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."feature_toggles" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."form_entries" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."form_templates" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."media_assets" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."navigation_links" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."page_sections" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."publish_jobs" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."scheduled_content" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "cms_admin_editor_all" ON "public"."site_settings" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



ALTER TABLE "public"."cms_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_blocks_public_read" ON "public"."content_blocks" FOR SELECT USING ((("status" = 'published'::"text") AND (("published_at" IS NULL) OR ("published_at" <= "now"()))));



ALTER TABLE "public"."content_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "currencies_read_public" ON "public"."currencies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "customers_deny_client_write" ON "public"."stripe_customers_cache" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "customers_read_auth" ON "public"."stripe_customers_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "deny all" ON "public"."auth_roles" USING (false) WITH CHECK (false);



CREATE POLICY "deny all" ON "public"."line_total_is_generated" USING (false) WITH CHECK (false);



CREATE POLICY "deny all" ON "public"."review_rate_limits" USING (false) WITH CHECK (false);



CREATE POLICY "deny all" ON "public"."total_is_generated" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_group" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_group_permissions" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_permission" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_user" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_user_groups" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."auth_user_user_permissions" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."django_admin_log" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."django_content_type" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."django_migrations" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all" ON "public"."django_session" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_ab_events" ON "public"."ab_events" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_admin_emails" ON "public"."admin_emails" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_auth_users" ON "public"."auth_users" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_delete" ON "public"."app_settings" FOR DELETE USING (false);



CREATE POLICY "deny_all_delete" ON "public"."job_runs" FOR DELETE USING (false);



CREATE POLICY "deny_all_insert" ON "public"."app_settings" FOR INSERT WITH CHECK (false);



CREATE POLICY "deny_all_order_status_audit" ON "public"."order_status_audit" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_orders_archive_export" ON "public"."orders_archive_export" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_refresh_tokens" ON "public"."refresh_tokens" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_select" ON "public"."app_settings" FOR SELECT USING (false);



CREATE POLICY "deny_all_select" ON "public"."job_runs" FOR SELECT USING (false);



CREATE POLICY "deny_all_stock_items" ON "public"."stock_items" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_stock_movements" ON "public"."stock_movements" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_all_update" ON "public"."app_settings" FOR UPDATE USING (false);



CREATE POLICY "deny_all_update" ON "public"."job_runs" FOR UPDATE USING (false);



CREATE POLICY "deny_write_webhooks" ON "public"."stripe_webhooks" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."django_admin_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_content_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."django_session" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecom_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_categories_admin_all" ON "public"."ecom_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_emails" "ae"
  WHERE ("lower"("ae"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_emails" "ae"
  WHERE ("lower"("ae"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "ecom_categories_admin_write" ON "public"."ecom_categories" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ecom_categories_public_read" ON "public"."ecom_categories" FOR SELECT USING (true);



CREATE POLICY "ecom_categories_read_anon" ON "public"."ecom_categories" FOR SELECT TO "anon" USING (true);



CREATE POLICY "ecom_categories_read_auth" ON "public"."ecom_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ecom_categories_select_public" ON "public"."ecom_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "ecom_categories_srv_all" ON "public"."ecom_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "ecom_img_all_sr" ON "public"."ecom_product_image_versions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "ecom_img_public_read" ON "public"."ecom_product_image_versions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."ecom_products" "p"
  WHERE (("p"."id" = "ecom_product_image_versions"."product_id") AND (COALESCE("p"."status", ''::"text") = ANY (ARRAY['active'::"text", 'published'::"text"]))))));



ALTER TABLE "public"."ecom_product_image_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_product_image_versions_seller_all" ON "public"."ecom_product_image_versions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ecom_products" "p"
     JOIN "trash"."sellers" "s" ON (("s"."id" = "p"."seller_id")))
  WHERE (("p"."id" = "ecom_product_image_versions"."product_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."ecom_products" "p"
     JOIN "trash"."sellers" "s" ON (("s"."id" = "p"."seller_id")))
  WHERE (("p"."id" = "ecom_product_image_versions"."product_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text")))));



ALTER TABLE "public"."ecom_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_products_admin_write" ON "public"."ecom_products" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ecom_products_all_sr" ON "public"."ecom_products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "ecom_products_public_read" ON "public"."ecom_products" FOR SELECT TO "authenticated", "anon" USING ((COALESCE("status", ''::"text") = ANY (ARRAY['active'::"text", 'published'::"text"])));



CREATE POLICY "ecom_products_select_public" ON "public"."ecom_products" FOR SELECT TO "authenticated", "anon" USING (("status" = ANY (ARRAY['active'::"text", 'published'::"text"])));



CREATE POLICY "ecom_products_seller_insert" ON "public"."ecom_products" FOR INSERT TO "authenticated" WITH CHECK ((("seller_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "trash"."sellers" "s"
  WHERE (("s"."id" = "ecom_products"."seller_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text"))))));



CREATE POLICY "ecom_products_seller_select" ON "public"."ecom_products" FOR SELECT TO "authenticated" USING ((("seller_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "trash"."sellers" "s"
  WHERE (("s"."id" = "ecom_products"."seller_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text"))))));



CREATE POLICY "ecom_products_seller_update" ON "public"."ecom_products" FOR UPDATE TO "authenticated" USING ((("seller_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "trash"."sellers" "s"
  WHERE (("s"."id" = "ecom_products"."seller_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text")))))) WITH CHECK ((("seller_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "trash"."sellers" "s"
  WHERE (("s"."id" = "ecom_products"."seller_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text"))))));



CREATE POLICY "ecom_products_srv_all" ON "public"."ecom_products" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."ecom_wishlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_toggles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_toggles_public_read" ON "public"."feature_toggles" FOR SELECT USING (("is_public" AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



ALTER TABLE "public"."form_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hist-ins-own-order" ON "public"."order_status_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "hist-sel-own-order" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "impr-insert-service" ON "public"."product_impressions" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "impr-select-service" ON "public"."product_impressions" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "impr_insert_any" ON "public"."shop_impressions" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."job_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_total_is_generated" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_assets_public_read" ON "public"."media_assets" FOR SELECT USING (("bucket" = 'public-media'::"text"));



CREATE POLICY "nav_delete_cms" ON "public"."navigation_links" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "nav_insert_cms" ON "public"."navigation_links" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "nav_links_public_read" ON "public"."navigation_links" FOR SELECT USING (("published" = true));



CREATE POLICY "nav_update_cms" ON "public"."navigation_links" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



ALTER TABLE "public"."navigation_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_clicks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_by_order_owner_all" ON "public"."order_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "order_items_owner" ON "public"."order_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_owner_read" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_owner_update" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_owner_write" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."user_id" = "auth"."uid"()) OR (COALESCE(NULLIF(("auth"."jwt"() ->> 'role'::"text"), ''::"text"), ''::"text") = 'support'::"text"))))));



CREATE POLICY "order_items_srv_write" ON "public"."order_items" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."order_status_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders_archive" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders_archive_export" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_archive_select" ON "public"."orders_archive" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (COALESCE(NULLIF(("auth"."jwt"() ->> 'role'::"text"), ''::"text"), ''::"text") = 'support'::"text")));



CREATE POLICY "orders_owner" ON "public"."orders" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "orders_owner_insert" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "orders_owner_read" ON "public"."orders" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "orders_owner_select" ON "public"."orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "orders_owner_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "orders_owner_write" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "orders_select_owner" ON "public"."orders" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (COALESCE(NULLIF(("auth"."jwt"() ->> 'role'::"text"), ''::"text"), ''::"text") = 'support'::"text")));



CREATE POLICY "orders_srv_write" ON "public"."orders" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."page_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_sections_public_read" ON "public"."page_sections" FOR SELECT USING (((NOT "is_draft") AND "visible" AND (("published_at" IS NULL) OR ("published_at" <= "now"()))));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_read" ON "public"."payments" FOR SELECT TO "role_admin" USING (true);



CREATE POLICY "payments_owner_by_order" ON "public"."payments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "payments_owner_read" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "payments_owner_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "payments_owner_write" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."user_id" = "auth"."uid"()) OR (COALESCE(NULLIF(("auth"."jwt"() ->> 'role'::"text"), ''::"text"), ''::"text") = 'support'::"text"))))));



CREATE POLICY "payments_srv_write" ON "public"."payments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "pe_service_all" ON "public"."processed_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "prm_delete_admin" ON "public"."product_review_messages" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "prm_delete_own" ON "public"."product_review_messages" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) AND ("author_role" = 'user'::"text")));



CREATE POLICY "prm_insert_admin" ON "public"."product_review_messages" FOR INSERT TO "service_role" WITH CHECK (("author_role" = 'admin'::"text"));



CREATE POLICY "prm_insert_user" ON "public"."product_review_messages" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("author_role" = 'user'::"text") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "prm_select_all" ON "public"."product_review_messages" FOR SELECT USING (true);



CREATE POLICY "prm_service_role_all" ON "public"."product_review_messages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "prm_update_admin" ON "public"."product_review_messages" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "prm_update_own" ON "public"."product_review_messages" FOR UPDATE TO "authenticated" USING ((("author_id" = "auth"."uid"()) AND ("author_role" = 'user'::"text"))) WITH CHECK ((("author_id" = "auth"."uid"()) AND ("author_role" = 'user'::"text")));



ALTER TABLE "public"."processed_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prod_impr_insert_any" ON "public"."product_impressions" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."product_impressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_rating_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_review_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_reviews_owner_insert" ON "public"."product_reviews_raw" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "product_reviews_owner_update" ON "public"."product_reviews_raw" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "product_reviews_public_read_approved" ON "public"."product_reviews_raw" FOR SELECT USING (("status" = 'approved'::"text"));



ALTER TABLE "public"."product_reviews_raw" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_reviews_raw_delete" ON "public"."product_reviews_raw" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "product_reviews_raw_insert" ON "public"."product_reviews_raw" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "product_reviews_raw_read" ON "public"."product_reviews_raw" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "product_reviews_raw_update" ON "public"."product_reviews_raw" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "products_auth_read" ON "public"."stripe_products_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "products_public_read_active" ON "public"."stripe_products_cache" FOR SELECT TO "authenticated" USING (((COALESCE("active", true) = true) AND (COALESCE("is_public", true) = true)));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."promotion_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_actions_select_public" ON "public"."promotion_actions" FOR SELECT USING (true);



ALTER TABLE "public"."promotion_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_conditions_select_public" ON "public"."promotion_conditions" FOR SELECT USING (true);



ALTER TABLE "public"."promotion_coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_coupons_select_public" ON "public"."promotion_coupons" FOR SELECT USING (true);



CREATE POLICY "promotion_select_public" ON "public"."promotions" FOR SELECT USING (true);



ALTER TABLE "public"."promotion_usages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promotion_usages_service_read" ON "public"."promotion_usages" FOR SELECT USING (true);



ALTER TABLE "public"."promotions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prr_service_role_all" ON "public"."product_reviews_raw" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "public_read_ecom_categories" ON "public"."ecom_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "public_read_ecom_product_image_versions" ON "public"."ecom_product_image_versions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "public_read_ecom_products" ON "public"."ecom_products" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "public_read_product_rating_stats" ON "public"."product_rating_stats" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."publish_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read auth" ON "public"."total_is_generated" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read own" ON "public"."review_rate_limits" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "read stats" ON "public"."product_rating_stats" FOR SELECT USING (true);



CREATE POLICY "read_active_for_public" ON "public"."ecom_products" FOR SELECT TO "authenticated", "anon" USING ((COALESCE("status", ''::"text") = ANY (ARRAY['active'::"text", 'published'::"text"])));



CREATE POLICY "read_job_runs_for_admin" ON "public"."job_runs" FOR SELECT TO "authenticated" USING (("auth"."role"() = 'admin'::"text"));



ALTER TABLE "public"."recent_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recent_views_ins" ON "public"."recent_views" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("public"."request_anon_id"() IS NOT NULL) AND ("anon_id" = "public"."request_anon_id"()))));



CREATE POLICY "recent_views_sel" ON "public"."recent_views" FOR SELECT USING (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("public"."request_anon_id"() IS NOT NULL) AND ("anon_id" = "public"."request_anon_id"()))));



CREATE POLICY "recent_views_upd" ON "public"."recent_views" FOR UPDATE USING (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("public"."request_anon_id"() IS NOT NULL) AND ("anon_id" = "public"."request_anon_id"())))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("public"."request_anon_id"() IS NOT NULL) AND ("anon_id" = "public"."request_anon_id"()))));



ALTER TABLE "public"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_votes_delete_self" ON "public"."review_votes" FOR DELETE USING (("auth"."uid"() = "voter_id"));



CREATE POLICY "review_votes_read_all" ON "public"."review_votes" FOR SELECT USING (true);



CREATE POLICY "review_votes_update_self" ON "public"."review_votes" FOR UPDATE USING (("auth"."uid"() = "voter_id")) WITH CHECK ((("auth"."uid"() = "voter_id") AND ("review_author_id" <> "auth"."uid"())));



CREATE POLICY "review_votes_write_self" ON "public"."review_votes" FOR INSERT WITH CHECK ((("auth"."uid"() = "voter_id") AND ("review_author_id" <> "auth"."uid"())));



CREATE POLICY "reviews_admin_moderate" ON "public"."product_reviews_raw" FOR UPDATE TO "role_admin" USING (true) WITH CHECK (true);



CREATE POLICY "reviews_owner_cud" ON "public"."product_reviews_raw" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['pending'::"text", 'rejected'::"text"]))));



CREATE POLICY "reviews_owner_read" ON "public"."product_reviews_raw" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_public_read_approved" ON "public"."product_reviews_raw" FOR SELECT TO "authenticated", "anon" USING (("status" = 'approved'::"text"));



CREATE POLICY "revisions_delete_admin" ON "public"."content_revisions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text")))));



CREATE POLICY "revisions_insert_cms" ON "public"."content_revisions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "revisions_update_cms" ON "public"."content_revisions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "rls_sw_select_service" ON "public"."stripe_webhooks" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "rls_swf_select_service" ON "public"."stripe_webhooks_failed" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."scheduled_content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sections_delete_cms" ON "public"."page_sections" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "sections_insert_cms" ON "public"."page_sections" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "sections_update_cms" ON "public"."page_sections" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "select prs public" ON "public"."product_rating_stats" FOR SELECT USING (true);



ALTER TABLE "public"."shop_clicks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_impressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_delete_admin" ON "public"."site_settings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text")))));



CREATE POLICY "site_settings_insert_admin" ON "public"."site_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text")))));



CREATE POLICY "site_settings_public_read" ON "public"."site_settings" FOR SELECT USING (("is_public" = true));



CREATE POLICY "site_settings_update_admin" ON "public"."site_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cms_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'admin'::"text")))));



ALTER TABLE "public"."stock_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_items_seller_all" ON "public"."stock_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ecom_products" "p"
     JOIN "trash"."sellers" "s" ON (("s"."id" = "p"."seller_id")))
  WHERE (("p"."id" = "stock_items"."product_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."ecom_products" "p"
     JOIN "trash"."sellers" "s" ON (("s"."id" = "p"."seller_id")))
  WHERE (("p"."id" = "stock_items"."product_id") AND ("s"."user_id" = "auth"."uid"()) AND ("s"."status" = 'active'::"text")))));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_balance_transactions_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_charges_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_customers_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_products_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stripe_webhooks_deny_client_write" ON "public"."stripe_webhooks" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."stripe_webhooks_failed" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stripe_webhooks_failed_srv_only" ON "public"."stripe_webhooks_failed" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "stripe_webhooks_read_auth" ON "public"."stripe_webhooks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "svc can delete title_blacklist" ON "public"."title_blacklist" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "svc can read title_blacklist" ON "public"."title_blacklist" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "svc can update title_blacklist" ON "public"."title_blacklist" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "svc can write title_blacklist" ON "public"."title_blacklist" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "sw_allow_service_all" ON "public"."stripe_webhooks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "swf_allow_service_all" ON "public"."stripe_webhooks_failed" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."title_blacklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."total_is_generated" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "translations_admin_editor_all" ON "public"."translations" USING ("public"."cms_is_editor"()) WITH CHECK ("public"."cms_is_editor"());



CREATE POLICY "translations_public_read" ON "public"."translations" FOR SELECT USING (true);



CREATE POLICY "wishlist_delete" ON "public"."ecom_wishlist" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wishlist_insert" ON "public"."ecom_wishlist" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wishlist_select" ON "public"."ecom_wishlist" FOR SELECT USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "ro_role";
GRANT ALL ON SCHEMA "public" TO "chatgpt_editor";
GRANT USAGE ON SCHEMA "public" TO "admin";



REVOKE ALL ON FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_best_discount_for_product"("p_id" "uuid", "p_category" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."_inventory_apply_delta"("p_order_id" "uuid", "p_reason" "text", "p_sign" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_mk_slug"("src" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_mk_slug"("src" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_mk_slug"("src" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_mk_slug"("src" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_norm_slug"("_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_norm_slug"("_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_norm_slug"("_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_norm_slug"("_slug" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("p_from" "text", "p_to" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "service_role";
GRANT ALL ON FUNCTION "public"."_order_try_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "service_role";
GRANT ALL ON FUNCTION "public"."_order_validate_transition"("from_status" "public"."order_status", "to_status" "public"."order_status") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_thumbnail_for_product"("p_id" "uuid", "p_sku" "text", "p_slug" "text") TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."product_reviews_raw" TO "service_role";
GRANT SELECT ON TABLE "public"."product_reviews_raw" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_reviews_raw" TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."add_product_review"("p_product_id" "uuid", "p_rating" integer, "p_title" "text", "p_body" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."add_review_v2"("_product_id" "uuid", "_user_id" "uuid", "_rating" integer, "_title" "text", "_body" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer, "day_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer, "day_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer, "day_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_dashboard_metrics_v1"("month_count" integer, "day_count" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_post_review_reply"("_review_id" "uuid", "_body" "text", "_actor_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_purge_except_product"("keep_id" "uuid", "dry_run" boolean) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_set_product_status"("p_id" "uuid", "p_status" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_set_review_status"("p_review_id" "uuid", "p_status" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."admin_upsert_product"("p" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_upsert_product"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_upsert_product"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_upsert_product"("p" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_upsert_product"("p" "jsonb") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."api_catalog_list"("_category" "text", "_limit" integer, "_offset" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."apply_stripe_event"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_stripe_event"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_stripe_event"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_stripe_event"("event" "jsonb") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."apply_successful_payment"("p_order" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_successful_payment"("p_order" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_successful_payment"("p_order" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_successful_payment"("p_order" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."cart_add_item"("p_user_id" "uuid", "p_product_id" "uuid", "p_qty" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cart_ensure"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cart_ensure"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cart_ensure"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cart_ensure"("p_user_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cart_get_summary"("p_user_id" "uuid") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cleanup_recent_views"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_recent_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_recent_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_recent_views"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cleanup_recent_views"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."clicks_daily"("_from" timestamp with time zone, "_to" timestamp with time zone) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer, "p_is_draft" boolean, "p_visible" boolean, "p_published_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer, "p_is_draft" boolean, "p_visible" boolean, "p_published_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer, "p_is_draft" boolean, "p_visible" boolean, "p_published_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_attach_section"("p_page_path" "text", "p_locale" "text", "p_block_id" "uuid", "p_sort_order" integer, "p_is_draft" boolean, "p_visible" boolean, "p_published_at" timestamp with time zone) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text", "p_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_create_block"("p_locale" "text", "p_type" "text", "p_content" "jsonb", "p_status" "text", "p_slug" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_enqueue_publish"("p_target" "text", "p_action" "text", "p_payload" "jsonb") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_insert_revision"("p_target_table" "text", "p_target_id" "uuid", "p_target_key" "text", "p_locale" "text", "p_snapshot" "jsonb", "p_message" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."cms_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_is_admin"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_is_editor"() TO "anon";
GRANT ALL ON FUNCTION "public"."cms_is_editor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_is_editor"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_is_editor"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_publish_block"("p_block_id" "uuid", "p_when" timestamp with time zone) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_publish_nav"("p_menu" "text", "p_locale" "text", "p_when" timestamp with time zone) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_publish_section"("p_section_id" "uuid", "p_when" timestamp with time zone) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_unpublish_block"("p_block_id" "uuid") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_unpublish_nav"("p_menu" "text", "p_locale" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_unpublish_section"("p_section_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_upsert_setting"("p_key" "text", "p_locale" "text", "p_value" "jsonb", "p_is_public" boolean) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cms_upsert_translation"("p_locale" "text", "p_tkey" "text", "p_value_json" "jsonb", "p_value_text" "text", "p_namespace" "text") TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT ON TABLE "public"."orders" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders" TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_or_get_pending_order"("p_user_id" "uuid") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_product_as_seller"("p_slug" "text", "p_title" "text", "p_price" numeric, "p_currency" "text", "p_status" "text", "p_images" "jsonb") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."currency_upper"() TO "anon";
GRANT ALL ON FUNCTION "public"."currency_upper"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."currency_upper"() TO "service_role";
GRANT ALL ON FUNCTION "public"."currency_upper"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "service_role";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."ecom_product_image_versions_set_current"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ecom_product_image_versions_set_current"() TO "anon";
GRANT ALL ON FUNCTION "public"."ecom_product_image_versions_set_current"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ecom_product_image_versions_set_current"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ecom_product_image_versions_set_current"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."ecom_products_soft_delete_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."ecom_products_soft_delete_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ecom_products_soft_delete_sync"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ecom_products_soft_delete_sync"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."ecom_wishlist_toggle"("p_product_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."ecomp_set_status_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."ecomp_set_status_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ecomp_set_status_on_insert"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ecomp_set_status_on_insert"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."ensure_review_root"("_review_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_review_root"("_review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_review_root"("_review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_review_root"("_review_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_review_root"("_review_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."fn_order_items_total_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_order_items_total_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_order_items_total_sync"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_order_items_total_sync"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_auth_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_auth_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_auth_user"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_reviews"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_reviews"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_reviews"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_reviews"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_reviews"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_seller"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_seller"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_seller"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_seller"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_seller"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_seller_orders"("p_limit" integer, "p_offset" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_seller_products"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_seller_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_seller_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_seller_products"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_seller_products"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_my_seller_sales_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_seller_sales_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_seller_sales_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_seller_sales_summary"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_seller_sales_summary"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."get_product_page"("_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_page"("_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_page"("_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_product_page"("_slug" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_product_rating_stats"("p_product_id" "uuid") TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."currencies" TO "anon";
GRANT SELECT ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";
GRANT SELECT ON TABLE "public"."currencies" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."currencies" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."ecom_product_image_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_product_image_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_product_image_versions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_product_image_versions" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."ecom_product_image_versions" TO "anon";



GRANT SELECT ON TABLE "public"."ecom_product_images_latest" TO "anon";
GRANT SELECT ON TABLE "public"."ecom_product_images_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_product_images_latest" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_product_images_latest" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_product_images_latest" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."ecom_products" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_products" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_products" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."ecom_products" TO "anon";
GRANT SELECT ON TABLE "public"."ecom_products" TO "authenticated";



GRANT SELECT ON TABLE "public"."products" TO "anon";
GRANT SELECT ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT SELECT ON TABLE "public"."products" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products" TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_recent_products"("_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recent_products"("_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_products"("_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_products"("_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_recent_products"("_limit" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_recommendations_recent"("_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recommendations_recent"("_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent"("_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent"("_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent"("_limit" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_recommendations_recent_with_details"("_limit" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text", "p_user_id" "uuid", "p_ip" "inet", "p_user_agent" "text", "p_referer" "text", "p_utm" "jsonb", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text", "p_user_id" "uuid", "p_ip" "inet", "p_user_agent" "text", "p_referer" "text", "p_utm" "jsonb", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text", "p_user_id" "uuid", "p_ip" "inet", "p_user_agent" "text", "p_referer" "text", "p_utm" "jsonb", "p_product_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."insert_product_impression"("p_slug" "text", "p_session_id" "text", "p_user_id" "uuid", "p_ip" "inet", "p_user_agent" "text", "p_referer" "text", "p_utm" "jsonb", "p_product_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_click"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_click"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_click"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_click"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_impression"("p_slug" "text", "p_params" "jsonb", "p_referrer" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product_id" "uuid", "p_params" "jsonb", "p_referrer" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_impression"("ip" "inet", "product_id" "uuid", "referrer" "text", "user_agent" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_impression"("p_product" "uuid", "p_session" "text", "p_ip" "inet", "p_ua" "text", "p_ref" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_impression_v1"("product_id" "uuid", "ip" "inet", "referrer" "text", "user_agent" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_orders_as_sim"("p_order_ids" "uuid"[], "p_mark" boolean) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."merge_recent_views"("_anon_id" "text", "_user_id" "uuid") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."meta_columns"("schemas" "text"[], "tbl" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."meta_columns"("schemas" "text"[], "tbl" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."meta_columns"("schemas" "text"[], "tbl" "text") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."meta_policies"("schemas" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."meta_policies"("schemas" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."meta_policies"("schemas" "text"[]) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."meta_tables"("schemas" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."meta_tables"("schemas" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."meta_tables"("schemas" "text"[]) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."meta_views"("schemas" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."meta_views"("schemas" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."meta_views"("schemas" "text"[]) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_allowed_status"("p_status" "public"."order_status") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "text", "p_to" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_allowed_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "text", "p_to" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "service_role";
GRANT ALL ON FUNCTION "public"."order_validate_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."orders_enforce_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."orders_enforce_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."orders_enforce_owner"() TO "service_role";
GRANT ALL ON FUNCTION "public"."orders_enforce_owner"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."orders_set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."orders_set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."orders_set_user_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."orders_set_user_id"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."orders_status_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."orders_status_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."orders_status_guard"() TO "service_role";
GRANT ALL ON FUNCTION "public"."orders_status_guard"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."pending_reviews_admin_v1"("limit_count" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."place_order"("p_user_id" "uuid") TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."place_order_with_items"("p_user_id" "uuid", "p_items" "jsonb", "p_currency" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."prm_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."prm_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prm_before_insert"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prm_before_insert"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."prm_depth_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."prm_depth_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prm_depth_guard"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prm_depth_guard"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_hanging_orders"("p_cutoff" timestamp with time zone, "p_dry_run" boolean) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."purge_old_events"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_old_events"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_old_events"("days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_old_events"("days" integer) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_processed_events"("cutoff_ts" timestamp with time zone) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."purge_public_data"("_dry_run" boolean, "_keep" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_public_data"("_dry_run" boolean, "_keep" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_public_data"("_dry_run" boolean, "_keep" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_public_data"("_dry_run" boolean, "_keep" "text"[]) TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_webhook_logs"("cutoff_ts" timestamp with time zone) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."purge_webhooks_failed_90d"() TO "anon";
GRANT ALL ON FUNCTION "public"."purge_webhooks_failed_90d"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_webhooks_failed_90d"() TO "service_role";
GRANT ALL ON FUNCTION "public"."purge_webhooks_failed_90d"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."recalc_order_totals"("p_order_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."recalc_product_rating"("p_product_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_new"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_new"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_new"() TO "service_role";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_new"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_old"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_old"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_old"() TO "service_role";
GRANT ALL ON FUNCTION "public"."recalc_product_rating_wrap_old"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) TO "anon";
GRANT ALL ON FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) TO "service_role";
GRANT ALL ON FUNCTION "public"."record_recent_view"("_product_id" "uuid", "_weight" real) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refresh_analytics_mviews"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_analytics_mviews"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_analytics_mviews"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_analytics_mviews"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."refresh_co_viewed_mv"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_co_viewed_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_co_viewed_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_co_viewed_mv"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_co_viewed_mv"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refresh_conversions_mviews"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_conversions_mviews"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_conversions_mviews"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_conversions_mviews"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_product_rating_stats"("p_product_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refresh_stripe_products_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_stripe_products_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_stripe_products_cache"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_stripe_products_cache"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."refund_order_apply"("p_order_id" "uuid", "p_refund_id" "text", "p_amount_cents" integer, "p_currency" "text", "p_reason" "text") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."reject_bad_titles"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_bad_titles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_bad_titles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."reject_bad_titles"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."request_anon_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_anon_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_anon_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."request_anon_id"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."reviews_unified_instead"() TO "anon";
GRANT ALL ON FUNCTION "public"."reviews_unified_instead"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reviews_unified_instead"() TO "service_role";
GRANT ALL ON FUNCTION "public"."reviews_unified_instead"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_products"("_q" "text", "_category" "text", "_limit" integer, "_offset" integer) TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."products_unified" TO "anon";
GRANT SELECT ON TABLE "public"."products_unified" TO "authenticated";
GRANT ALL ON TABLE "public"."products_unified" TO "service_role";
GRANT SELECT ON TABLE "public"."products_unified" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products_unified" TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."search_products"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_products"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."search_products_v2"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer, "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products_v2"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer, "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products_v2"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer, "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_products_v2"("q" "text", "sort_by" "text", "sort_dir" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "limit_count" integer, "offset_count" integer, "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."search_products_v2_count"("q" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products_v2_count"("q" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products_v2_count"("q" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_products_v2_count"("q" "text", "min_price" numeric, "max_price" numeric, "statuses" "text"[], "category_slugs" "text"[], "skus" "text"[], "sources" "text"[], "min_rating" real) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."secure_submit_review_unified"("p_source_schema" "text", "p_source_table" "text", "p_source_pk" "text", "p_rating" smallint, "p_title" "text", "p_body" "text", "p_ip_hash" "text", "p_user_agent" "text", "p_user_id" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."set_current_image_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_image_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_image_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_current_image_version"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_product_image"("p_product_id" "uuid", "p_sku" "text", "p_path" "text", "p_source_url" "text", "p_uploaded_by" "uuid") TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."set_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_settings_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_settings_updated_at"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "chatgpt_editor";



REVOKE ALL ON FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_catalog_published"("p_refresh_mv" boolean) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."sync_ecom_products_from_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ecom_products_from_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ecom_products_from_products"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_ecom_products_from_products"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."sync_order_on_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_on_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_on_payment"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_order_on_payment"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."sync_order_on_webhook"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_on_webhook"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_on_webhook"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_order_on_webhook"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."sync_product_image_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_product_image_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_product_image_path"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_product_image_path"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."table_counts_small"("max_size_mb" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."table_counts_small"("max_size_mb" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."table_counts_small"("max_size_mb" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."table_counts_small"("max_size_mb" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tf_rev_content_blocks"() TO "anon";
GRANT ALL ON FUNCTION "public"."tf_rev_content_blocks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tf_rev_content_blocks"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tf_rev_content_blocks"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tf_rev_navigation_links"() TO "anon";
GRANT ALL ON FUNCTION "public"."tf_rev_navigation_links"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tf_rev_navigation_links"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tf_rev_navigation_links"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tf_rev_page_sections"() TO "anon";
GRANT ALL ON FUNCTION "public"."tf_rev_page_sections"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tf_rev_page_sections"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tf_rev_page_sections"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tf_rev_site_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."tf_rev_site_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tf_rev_site_settings"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tf_rev_site_settings"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."top_offers_with_share"("_from" timestamp with time zone, "_to" timestamp with time zone, "_limit" integer) TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tr_payments_status_propagate"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_payments_status_propagate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_payments_status_propagate"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tr_payments_status_propagate"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tr_recalc_after_order_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_order_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_order_items"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_order_items"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tr_recalc_after_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_orders"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_orders"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."tr_recalc_after_review_unified"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_review_unified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_review_unified"() TO "service_role";
GRANT ALL ON FUNCTION "public"."tr_recalc_after_review_unified"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_cart_items_default_price"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_cart_items_default_price"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_cart_items_default_price"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_cart_items_default_price"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_block_zero"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_block_zero"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_block_zero"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_block_zero"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_forbid_cancel_if_paid"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_guard_refund"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_guard_refund"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_guard_refund"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_guard_refund"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_inventory"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_inventory"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_log_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_log_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_log_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_log_status"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_normalize_currency"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_normalize_currency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_normalize_currency"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_normalize_currency"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_status_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_status_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_status_audit"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_status_audit"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_orders_validate_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orders_validate_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orders_validate_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_orders_validate_status"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_payments_sync_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_payments_sync_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_payments_sync_order"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_payments_sync_order"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_reject_profanity"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_reject_profanity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_reject_profanity"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_reject_profanity"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_resolve_impression_pid"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_resolve_impression_pid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_resolve_impression_pid"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_resolve_impression_pid"() TO "chatgpt_editor";



GRANT ALL ON FUNCTION "public"."trg_validate_item_money"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_item_money"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_item_money"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_validate_item_money"() TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."product_rating_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."product_rating_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."product_rating_stats" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_rating_stats" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."ab_events" TO "anon";
GRANT SELECT ON TABLE "public"."ab_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ab_events" TO "service_role";
GRANT SELECT ON TABLE "public"."ab_events" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ab_events" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."admin_emails" TO "service_role";
GRANT SELECT ON TABLE "public"."admin_emails" TO "ro_role";
GRANT SELECT ON TABLE "public"."admin_emails" TO "anon";
GRANT SELECT ON TABLE "public"."admin_emails" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."admin_emails" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."app_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."app_settings" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."app_settings" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_group" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_group" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_group" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_group_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_group_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_group_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_group_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_group_permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_group_permissions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_group_permissions" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_group_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_group_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_group_permissions_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_group_permissions_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_permission" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_permission" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_permission" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_permission_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_permission_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_permission_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_permission_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_roles" TO "ro_role";
GRANT SELECT ON TABLE "public"."auth_roles" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_roles" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_user" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_user" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_user" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_user_groups" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_user_groups" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_user_groups" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_user_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_user_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_user_groups_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_user_groups_id_seq" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_user_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_user_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."auth_user_user_permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_user_user_permissions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_user_user_permissions" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."auth_user_user_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_user_user_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_user_user_permissions_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."auth_user_user_permissions_id_seq" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."auth_users" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users" TO "service_role";
GRANT SELECT ON TABLE "public"."auth_users" TO "ro_role";
GRANT SELECT ON TABLE "public"."auth_users" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."auth_users" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."banners" TO "anon";
GRANT SELECT ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";
GRANT SELECT ON TABLE "public"."banners" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."banners" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."carts" TO "service_role";
GRANT SELECT ON TABLE "public"."carts" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."carts" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."catalog_mv" TO "service_role";
GRANT SELECT ON TABLE "public"."catalog_mv" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."catalog_mv" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."catalog_published" TO "anon";
GRANT SELECT ON TABLE "public"."catalog_published" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_published" TO "service_role";
GRANT SELECT ON TABLE "public"."catalog_published" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."catalog_published" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."shop_clicks" TO "service_role";
GRANT SELECT ON TABLE "public"."shop_clicks" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."shop_clicks" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."clicks" TO "anon";
GRANT SELECT ON TABLE "public"."clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."clicks" TO "service_role";
GRANT SELECT ON TABLE "public"."clicks" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."clicks" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."cms_roles" TO "anon";
GRANT SELECT ON TABLE "public"."cms_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."cms_roles" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cms_roles" TO "chatgpt_editor";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_impressions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_impressions" TO "authenticated";
GRANT ALL ON TABLE "public"."product_impressions" TO "service_role";
GRANT SELECT ON TABLE "public"."product_impressions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_impressions" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."shop_impressions" TO "service_role";
GRANT SELECT ON TABLE "public"."shop_impressions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."shop_impressions" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."co_viewed_mv" TO "service_role";
GRANT SELECT ON TABLE "public"."co_viewed_mv" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."co_viewed_mv" TO "chatgpt_editor";



GRANT SELECT,INSERT ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."contact_messages" TO "ro_role";
GRANT SELECT ON TABLE "public"."contact_messages" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."contact_messages" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."content_blocks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."content_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."content_blocks" TO "service_role";
GRANT SELECT ON TABLE "public"."content_blocks" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."content_blocks" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."content_revisions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."content_revisions" TO "authenticated";
GRANT ALL ON TABLE "public"."content_revisions" TO "service_role";
GRANT SELECT ON TABLE "public"."content_revisions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."content_revisions" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."django_admin_log" TO "service_role";
GRANT SELECT ON TABLE "public"."django_admin_log" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."django_admin_log" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."django_admin_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."django_admin_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."django_admin_log_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."django_admin_log_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."django_content_type" TO "service_role";
GRANT SELECT ON TABLE "public"."django_content_type" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."django_content_type" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."django_content_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."django_content_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."django_content_type_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."django_content_type_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."django_migrations" TO "service_role";
GRANT SELECT ON TABLE "public"."django_migrations" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."django_migrations" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."django_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."django_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."django_migrations_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."django_migrations_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."django_session" TO "service_role";
GRANT SELECT ON TABLE "public"."django_session" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."django_session" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."ecom_categories" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_categories" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_categories" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."ecom_categories" TO "authenticated";



GRANT SELECT ON TABLE "public"."ecom_products_view" TO "anon";
GRANT SELECT ON TABLE "public"."ecom_products_view" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_products_view" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_products_view" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_products_view" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."ecom_products_with_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_products_with_ratings" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_products_with_ratings" TO "ro_role";
GRANT SELECT ON TABLE "public"."ecom_products_with_ratings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_products_with_ratings" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."ecom_wishlist" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."ecom_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_wishlist" TO "service_role";
GRANT SELECT ON TABLE "public"."ecom_wishlist" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ecom_wishlist" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."feature_toggles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feature_toggles" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_toggles" TO "service_role";
GRANT SELECT ON TABLE "public"."feature_toggles" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feature_toggles" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."form_entries" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."form_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."form_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."form_entries" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."form_entries" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."form_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."form_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."form_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."form_templates" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."form_templates" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."impressions" TO "anon";
GRANT SELECT ON TABLE "public"."impressions" TO "authenticated";
GRANT ALL ON TABLE "public"."impressions" TO "service_role";
GRANT SELECT ON TABLE "public"."impressions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."impressions" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."job_runs" TO "service_role";
GRANT SELECT ON TABLE "public"."job_runs" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."job_runs" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."job_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_runs_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."job_runs_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."line_total_is_generated" TO "service_role";
GRANT SELECT ON TABLE "public"."line_total_is_generated" TO "ro_role";
GRANT SELECT ON TABLE "public"."line_total_is_generated" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."line_total_is_generated" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."line_total_is_generated_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."line_total_is_generated_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."line_total_is_generated_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."line_total_is_generated_id_seq" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."media_assets" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";
GRANT SELECT ON TABLE "public"."media_assets" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."media_assets" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."navigation_links" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."navigation_links" TO "authenticated";
GRANT ALL ON TABLE "public"."navigation_links" TO "service_role";
GRANT SELECT ON TABLE "public"."navigation_links" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."navigation_links" TO "chatgpt_editor";



GRANT SELECT,INSERT ON TABLE "public"."offer_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_clicks" TO "service_role";
GRANT SELECT ON TABLE "public"."offer_clicks" TO "ro_role";
GRANT SELECT,INSERT ON TABLE "public"."offer_clicks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."offer_clicks" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."offers_id_seq" TO "ro_role";
GRANT USAGE ON SEQUENCE "public"."offers_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."order_items" TO "service_role";
GRANT SELECT ON TABLE "public"."order_items" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_items" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT SELECT ON TABLE "public"."payments" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payments" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."order_history_v" TO "authenticated";
GRANT ALL ON TABLE "public"."order_history_v" TO "service_role";
GRANT SELECT ON TABLE "public"."order_history_v" TO "ro_role";
GRANT SELECT ON TABLE "public"."order_history_v" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_history_v" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."order_items_v" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items_v" TO "service_role";
GRANT SELECT ON TABLE "public"."order_items_v" TO "ro_role";
GRANT SELECT ON TABLE "public"."order_items_v" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_items_v" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."order_status_audit" TO "anon";
GRANT SELECT ON TABLE "public"."order_status_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."order_status_audit" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_status_audit" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."order_status_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_status_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_status_audit_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."order_status_audit_id_seq" TO "chatgpt_editor";



GRANT SELECT,INSERT ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";
GRANT SELECT ON TABLE "public"."order_status_history" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_status_history" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."order_v2" TO "anon";
GRANT SELECT ON TABLE "public"."order_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."order_v2" TO "service_role";
GRANT SELECT ON TABLE "public"."order_v2" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_v2" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."orders_archive" TO "anon";
GRANT SELECT ON TABLE "public"."orders_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_archive" TO "service_role";
GRANT SELECT ON TABLE "public"."orders_archive" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders_archive" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."orders_archive_export" TO "anon";
GRANT SELECT ON TABLE "public"."orders_archive_export" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_archive_export" TO "service_role";
GRANT SELECT ON TABLE "public"."orders_archive_export" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders_archive_export" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."page_sections" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."page_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."page_sections" TO "service_role";
GRANT SELECT ON TABLE "public"."page_sections" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."page_sections" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."processed_events" TO "anon";
GRANT SELECT ON TABLE "public"."processed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_events" TO "service_role";
GRANT SELECT ON TABLE "public"."processed_events" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."processed_events" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."product" TO "service_role";
GRANT SELECT ON TABLE "public"."product" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."product" TO "admin";



GRANT SELECT ON TABLE "public"."product_catalog" TO "anon";
GRANT SELECT ON TABLE "public"."product_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."product_catalog" TO "service_role";
GRANT SELECT ON TABLE "public"."product_catalog" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_catalog" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."product_catalog_v" TO "anon";
GRANT SELECT ON TABLE "public"."product_catalog_v" TO "authenticated";
GRANT ALL ON TABLE "public"."product_catalog_v" TO "service_role";
GRANT SELECT ON TABLE "public"."product_catalog_v" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_catalog_v" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."product_impressions_30d" TO "anon";
GRANT SELECT ON TABLE "public"."product_impressions_30d" TO "authenticated";
GRANT ALL ON TABLE "public"."product_impressions_30d" TO "service_role";
GRANT SELECT ON TABLE "public"."product_impressions_30d" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_impressions_30d" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."product_review_messages" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_review_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."product_review_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."product_review_messages" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_review_messages" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."product_reviews_admin_v" TO "anon";
GRANT SELECT ON TABLE "public"."product_reviews_admin_v" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews_admin_v" TO "service_role";
GRANT SELECT ON TABLE "public"."product_reviews_admin_v" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_reviews_admin_v" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."product_with_discount" TO "service_role";
GRANT SELECT ON TABLE "public"."product_with_discount" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_with_discount" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."product_with_discount" TO "admin";



GRANT ALL ON TABLE "public"."product_with_discount_public" TO "service_role";
GRANT SELECT ON TABLE "public"."product_with_discount_public" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."product_with_discount_public" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."product_with_discount_public" TO "anon";
GRANT SELECT ON TABLE "public"."product_with_discount_public" TO "authenticated";



GRANT SELECT ON TABLE "public"."products_unified_dedup" TO "anon";
GRANT SELECT ON TABLE "public"."products_unified_dedup" TO "authenticated";
GRANT ALL ON TABLE "public"."products_unified_dedup" TO "service_role";
GRANT SELECT ON TABLE "public"."products_unified_dedup" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products_unified_dedup" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."products_v" TO "authenticated";
GRANT ALL ON TABLE "public"."products_v" TO "service_role";
GRANT SELECT ON TABLE "public"."products_v" TO "ro_role";
GRANT SELECT ON TABLE "public"."products_v" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products_v" TO "chatgpt_editor";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."promotion_actions" TO "anon";
GRANT SELECT ON TABLE "public"."promotion_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_actions" TO "service_role";
GRANT SELECT ON TABLE "public"."promotion_actions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promotion_actions" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."promotion_conditions" TO "anon";
GRANT SELECT ON TABLE "public"."promotion_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_conditions" TO "service_role";
GRANT SELECT ON TABLE "public"."promotion_conditions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promotion_conditions" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."promotion_coupons" TO "anon";
GRANT SELECT ON TABLE "public"."promotion_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_coupons" TO "service_role";
GRANT SELECT ON TABLE "public"."promotion_coupons" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promotion_coupons" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."promotion_usages" TO "anon";
GRANT SELECT ON TABLE "public"."promotion_usages" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_usages" TO "service_role";
GRANT SELECT ON TABLE "public"."promotion_usages" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promotion_usages" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."promotions" TO "anon";
GRANT SELECT ON TABLE "public"."promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotions" TO "service_role";
GRANT SELECT ON TABLE "public"."promotions" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promotions" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."publish_jobs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."publish_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."publish_jobs" TO "service_role";
GRANT SELECT ON TABLE "public"."publish_jobs" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."publish_jobs" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_catalog" TO "anon";
GRANT SELECT ON TABLE "public"."published_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."published_catalog" TO "service_role";
GRANT SELECT ON TABLE "public"."published_catalog" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_catalog" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_content_blocks" TO "anon";
GRANT SELECT ON TABLE "public"."published_content_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."published_content_blocks" TO "service_role";
GRANT SELECT ON TABLE "public"."published_content_blocks" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_content_blocks" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_media_assets" TO "anon";
GRANT SELECT ON TABLE "public"."published_media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."published_media_assets" TO "service_role";
GRANT SELECT ON TABLE "public"."published_media_assets" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_media_assets" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_navigation_links" TO "anon";
GRANT SELECT ON TABLE "public"."published_navigation_links" TO "authenticated";
GRANT ALL ON TABLE "public"."published_navigation_links" TO "service_role";
GRANT SELECT ON TABLE "public"."published_navigation_links" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_navigation_links" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_page_sections" TO "anon";
GRANT SELECT ON TABLE "public"."published_page_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."published_page_sections" TO "service_role";
GRANT SELECT ON TABLE "public"."published_page_sections" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_page_sections" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."site_settings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."site_settings" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."site_settings" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_site_settings" TO "anon";
GRANT SELECT ON TABLE "public"."published_site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."published_site_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."published_site_settings" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_site_settings" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."translations" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."translations" TO "authenticated";
GRANT ALL ON TABLE "public"."translations" TO "service_role";
GRANT SELECT ON TABLE "public"."translations" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."translations" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."published_translations" TO "anon";
GRANT SELECT ON TABLE "public"."published_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."published_translations" TO "service_role";
GRANT SELECT ON TABLE "public"."published_translations" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."published_translations" TO "chatgpt_editor";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."recent_views" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."recent_views" TO "authenticated";
GRANT ALL ON TABLE "public"."recent_views" TO "service_role";
GRANT SELECT ON TABLE "public"."recent_views" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."recent_views" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."refresh_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."refresh_tokens" TO "service_role";
GRANT SELECT ON TABLE "public"."refresh_tokens" TO "ro_role";
GRANT SELECT ON TABLE "public"."refresh_tokens" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."refresh_tokens" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."review_rate_limits" TO "service_role";
GRANT SELECT ON TABLE "public"."review_rate_limits" TO "ro_role";
GRANT SELECT ON TABLE "public"."review_rate_limits" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."review_rate_limits" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."review_votes" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."review_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."review_votes" TO "service_role";
GRANT SELECT ON TABLE "public"."review_votes" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."review_votes" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."reviews_unified" TO "anon";
GRANT SELECT ON TABLE "public"."reviews_unified" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews_unified" TO "service_role";
GRANT SELECT ON TABLE "public"."reviews_unified" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reviews_unified" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."scheduled_content" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scheduled_content" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_content" TO "service_role";
GRANT SELECT ON TABLE "public"."scheduled_content" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scheduled_content" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stock_items" TO "anon";
GRANT SELECT ON TABLE "public"."stock_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_items" TO "service_role";
GRANT SELECT ON TABLE "public"."stock_items" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stock_items" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stock_movements" TO "anon";
GRANT SELECT ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";
GRANT SELECT ON TABLE "public"."stock_movements" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stock_movements" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."stock_movements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_movements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_movements_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."stock_movements_id_seq" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stripe_balance_transactions_cache" TO "authenticated";
GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."stripe_balance_transactions_cache" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_balance_transactions_cache" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stripe_charges_cache" TO "authenticated";
GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."stripe_charges_cache" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_charges_cache" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stripe_customers_cache" TO "authenticated";
GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."stripe_customers_cache" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_customers_cache" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stripe_products_cache" TO "authenticated";
GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."stripe_products_cache" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_products_cache" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."stripe_webhooks" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_webhooks" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."stripe_webhooks_failed" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_webhooks_failed" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."stripe_webhooks_failed_surrogate_id_seq" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."stripe_webhooks_with_mode" TO "anon";
GRANT SELECT ON TABLE "public"."stripe_webhooks_with_mode" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhooks_with_mode" TO "service_role";
GRANT SELECT ON TABLE "public"."stripe_webhooks_with_mode" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stripe_webhooks_with_mode" TO "chatgpt_editor";



GRANT SELECT ON TABLE "public"."title_blacklist" TO "authenticated";
GRANT ALL ON TABLE "public"."title_blacklist" TO "service_role";
GRANT SELECT ON TABLE "public"."title_blacklist" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."title_blacklist" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."total_is_generated" TO "service_role";
GRANT SELECT ON TABLE "public"."total_is_generated" TO "ro_role";
GRANT SELECT ON TABLE "public"."total_is_generated" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."total_is_generated" TO "chatgpt_editor";



GRANT ALL ON SEQUENCE "public"."total_is_generated_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."total_is_generated_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."total_is_generated_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."total_is_generated_id_seq" TO "chatgpt_editor";



GRANT ALL ON TABLE "public"."v_catalog" TO "service_role";
GRANT SELECT ON TABLE "public"."v_catalog" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_catalog" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."v_catalog" TO "anon";
GRANT SELECT ON TABLE "public"."v_catalog" TO "authenticated";



GRANT ALL ON TABLE "public"."v_product_images" TO "service_role";
GRANT SELECT ON TABLE "public"."v_product_images" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_product_images" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."v_product_images" TO "anon";
GRANT SELECT ON TABLE "public"."v_product_images" TO "authenticated";



GRANT SELECT ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."webhook_logs" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."webhook_logs" TO "chatgpt_editor";
GRANT SELECT ON TABLE "public"."webhook_logs" TO "anon";



GRANT ALL ON TABLE "public"."webhook_logs_app" TO "service_role";
GRANT SELECT ON TABLE "public"."webhook_logs_app" TO "ro_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."webhook_logs_app" TO "chatgpt_editor";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "chatgpt_editor";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "chatgpt_editor";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "ro_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "chatgpt_editor";






