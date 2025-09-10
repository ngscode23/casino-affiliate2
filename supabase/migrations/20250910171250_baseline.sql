

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


CREATE SCHEMA IF NOT EXISTS "aff";


ALTER SCHEMA "aff" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "shop";


ALTER SCHEMA "shop" OWNER TO "postgres";


CREATE TYPE "aff"."event_type" AS ENUM (
    'impression',
    'click',
    'purchase'
);


ALTER TYPE "aff"."event_type" OWNER TO "postgres";


CREATE TYPE "aff"."placement_tier" AS ENUM (
    'gold',
    'silver',
    'bronze'
);


ALTER TYPE "aff"."placement_tier" OWNER TO "postgres";


CREATE DOMAIN "public"."currency_code" AS character(3)
	CONSTRAINT "currency_code_check" CHECK ((VALUE ~ '^[A-Z]{3}$'::"text"));


ALTER DOMAIN "public"."currency_code" OWNER TO "postgres";


CREATE DOMAIN "public"."email_citext" AS "public"."citext"
	CONSTRAINT "email_citext_check" CHECK ((POSITION(('@'::"text") IN (VALUE)) > 1));


ALTER DOMAIN "public"."email_citext" OWNER TO "postgres";


CREATE TYPE "shop"."promo_type" AS ENUM (
    'percent',
    'fixed'
);


ALTER TYPE "shop"."promo_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "aff"."track_event"("p_type" "aff"."event_type", "p_offer_id" bigint, "p_session" "text", "p_ip_hash" "text", "p_ua" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  insert into aff.events(event_type, offer_id, session_id, ip_hash, user_agent)
  values (p_type, p_offer_id, p_session, p_ip_hash, p_ua);
$$;


ALTER FUNCTION "aff"."track_event"("p_type" "aff"."event_type", "p_offer_id" bigint, "p_session" "text", "p_ip_hash" "text", "p_ua" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "shop"."promotions" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "type" "shop"."promo_type" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "coupon_code" "text",
    "is_stackable" boolean DEFAULT false NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "promotions_value_check" CHECK (("value" >= (0)::numeric))
);


ALTER TABLE "shop"."promotions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."active_promotions"("now_ts" timestamp with time zone DEFAULT "now"()) RETURNS SETOF "shop"."promotions"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from shop.promotions p
  where p.starts_at <= now_ts
    and (p.ends_at is null or p.ends_at >= now_ts)
$$;


ALTER FUNCTION "shop"."active_promotions"("now_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."add_review"("p_product_id" bigint, "p_rating" integer, "p_title" "text", "p_body" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'shop'
    AS $$
declare v_id bigint;
begin
  insert into shop.reviews(product_id, user_id, rating, title, body, status)
  values (p_product_id, auth.uid(), p_rating, left(p_title,200), left(p_body,5000), 'pending')
  returning id into v_id;
  return v_id;
end $$;


ALTER FUNCTION "shop"."add_review"("p_product_id" bigint, "p_rating" integer, "p_title" "text", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."compute_price"("p_product_id" bigint, "p_variant_id" bigint DEFAULT NULL::bigint, "p_qty" integer DEFAULT 1, "p_coupon" "text" DEFAULT NULL::"text") RETURNS TABLE("final_price" numeric, "applied" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  base numeric;
begin
  select coalesce(v.price_override, p.price)
    into base
  from shop.products p
  left join shop.variants v
    on v.id = p_variant_id and v.product_id = p.id
  where p.id = p_product_id;

  return query
  with active as (
    select *
    from shop.active_promotions()
    where (coupon_code is null or lower(coupon_code) = lower(p_coupon))
  ),
  applied as (
    select
      jsonb_agg(jsonb_build_object('id', id, 'type', type, 'value', value)) as js,
      sum(case when type='percent' then base * value/100 else value end) as discount
    from active
  )
  select
    greatest(0, base * p_qty - coalesce(applied.discount,0)) as final_price,
    coalesce(applied.js, '[]'::jsonb) as applied;
end $$;


ALTER FUNCTION "shop"."compute_price"("p_product_id" bigint, "p_variant_id" bigint, "p_qty" integer, "p_coupon" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."moderate_review"("p_review_id" bigint, "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'shop'
    AS $$
begin
  if p_status not in ('approved','rejected') then
    raise exception 'invalid status' using errcode='22023';
  end if;

  if coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb ->> 'role' <> 'admin' then
    raise exception 'forbidden' using errcode='42501';
  end if;

  update shop.reviews set status = p_status where id = p_review_id;
end $$;


ALTER FUNCTION "shop"."moderate_review"("p_review_id" bigint, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."products_autosku"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.sku is null or length(btrim(new.sku)) = 0 then
    new.sku := 'SKU-' || coalesce(new.id, nextval(pg_get_serial_sequence('shop.products','id')));
  end if;
  return new;
end $$;


ALTER FUNCTION "shop"."products_autosku"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."rate_limit_review"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if exists (
    select 1 from shop.reviews
    where product_id = new.product_id
      and user_id = v_uid
      and created_at >= now() - interval '60 seconds'
  ) then
    raise exception 'Too many updates, wait a minute';
  end if;
  return new;
end $$;


ALTER FUNCTION "shop"."rate_limit_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."refresh_product_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  refresh materialized view concurrently shop.product_ratings;
  return null;
end $$;


ALTER FUNCTION "shop"."refresh_product_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."refresh_product_ratings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'shop'
    AS $$
begin
  refresh materialized view shop.product_ratings;
  return null;
end $$;


ALTER FUNCTION "shop"."refresh_product_ratings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."reviews_sanitize_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.rating < 1 then new.rating := 1; end if;
  if new.rating > 5 then new.rating := 5; end if;
  return new;
end $$;


ALTER FUNCTION "shop"."reviews_sanitize_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."stock_touch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "shop"."stock_touch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "shop"."touch_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "shop"."touch_stock"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "aff"."events" (
    "id" bigint NOT NULL,
    "event_type" "aff"."event_type" NOT NULL,
    "offer_id" bigint NOT NULL,
    "session_id" "text",
    "ip_hash" "text",
    "user_agent" "text",
    "event_ts" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "aff"."events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "aff"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "aff"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "aff"."events_id_seq" OWNED BY "aff"."events"."id";



CREATE OR REPLACE VIEW "aff"."offer_stats_30d" AS
 WITH "base" AS (
         SELECT "events"."offer_id",
            "sum"((("events"."event_type" = 'impression'::"aff"."event_type"))::integer) AS "impressions",
            "sum"((("events"."event_type" = 'click'::"aff"."event_type"))::integer) AS "clicks",
            "sum"((("events"."event_type" = 'purchase'::"aff"."event_type"))::integer) AS "purchases"
           FROM "aff"."events"
          WHERE ("events"."event_ts" >= ("now"() - '30 days'::interval))
          GROUP BY "events"."offer_id"
        )
 SELECT "offer_id",
    "impressions",
    "clicks",
    "purchases",
        CASE
            WHEN ("impressions" > 0) THEN "round"(((100.0 * ("clicks")::numeric) / ("impressions")::numeric), 2)
            ELSE (0)::numeric
        END AS "ctr_pct"
   FROM "base" "b";


ALTER VIEW "aff"."offer_stats_30d" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "aff"."offers" (
    "id" bigint NOT NULL,
    "source_id" bigint,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "affiliate_url" "text",
    "country" "text",
    "license" "text",
    "payout_hours" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "aff"."offers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "aff"."offers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "aff"."offers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "aff"."offers_id_seq" OWNED BY "aff"."offers"."id";



CREATE TABLE IF NOT EXISTS "aff"."sources" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "base_url" "text"
);


ALTER TABLE "aff"."sources" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "aff"."sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "aff"."sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "aff"."sources_id_seq" OWNED BY "aff"."sources"."id";



CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "kind" "text" DEFAULT 'shipping'::"text" NOT NULL,
    "name" "text",
    "line1" "text" NOT NULL,
    "line2" "text",
    "city" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'DE'::"text" NOT NULL,
    "phone" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "actor" "uuid",
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";



CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "qty" integer NOT NULL,
    "price_at_add" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "shop"."categories" (
    "id" bigint NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    CONSTRAINT "categories_slug_check" CHECK (("slug" ~ '^[a-z0-9-]+$'::"text"))
);


ALTER TABLE "shop"."categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."categories" AS
 SELECT "id",
    "slug",
    "name"
   FROM "shop"."categories";


ALTER VIEW "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions" (
    "code" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "code" "text" NOT NULL,
    "kind" "text" DEFAULT 'percent'::"text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "max_redemptions" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecom_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ecom_categories" OWNER TO "postgres";


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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ecom_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecom_wishlist" (
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ecom_wishlist" OWNER TO "postgres";


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
    CONSTRAINT "order_items_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "provider" "text" NOT NULL,
    "provider_ref" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "shop"."reviews" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" "text",
    "body" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "shop"."reviews" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "shop"."product_ratings" AS
 SELECT "product_id",
    "round"("avg"("rating"), 2) AS "rating_value",
    "count"(*) AS "rating_count"
   FROM "shop"."reviews"
  WHERE ("status" = 'approved'::"text")
  GROUP BY "product_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "shop"."product_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "shop"."products" (
    "id" bigint NOT NULL,
    "sku" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "category_id" bigint,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"simple"'::"regconfig", COALESCE("title", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"simple"'::"regconfig", COALESCE("description", ''::"text")), 'B'::"char"))) STORED,
    "slug" "text",
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "shop"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "c"."slug",
    "p"."title",
    "p"."description",
    "p"."price",
    "c"."name" AS "category",
    COALESCE("pr"."rating_value", (0)::numeric) AS "rating",
    COALESCE("pr"."rating_count", (0)::bigint) AS "rating_count"
   FROM (("shop"."products" "p"
     LEFT JOIN "shop"."categories" "c" ON (("c"."id" = "p"."category_id")))
     LEFT JOIN "shop"."product_ratings" "pr" ON (("pr"."product_id" = "p"."id")))
  WHERE ("p"."is_active" = true);


ALTER VIEW "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reviews" AS
 SELECT "id",
    "product_id",
    "rating",
    "title",
    "body",
    "created_at"
   FROM "shop"."reviews" "r";


ALTER VIEW "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews__backup_20250909_181553" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "user_id" "uuid",
    "rating" integer NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews__backup_20250909_181553" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reviews__backup_20250909_181804" AS
 SELECT "id",
    "product_id",
    "rating",
    "title",
    "body",
    "created_at"
   FROM "shop"."reviews" "r";


ALTER VIEW "public"."reviews__backup_20250909_181804" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "carrier" "text",
    "tracking_number" "text",
    "status" "text" DEFAULT 'ready'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shipments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."categories_id_seq" OWNED BY "shop"."categories"."id";



CREATE TABLE IF NOT EXISTS "shop"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customers_email_check" CHECK ((POSITION(('@'::"text") IN ("email")) > 1))
);


ALTER TABLE "shop"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "shop"."order_items" (
    "id" bigint NOT NULL,
    "order_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "variant_id" bigint,
    "qty" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "line_total" numeric(10,2) GENERATED ALWAYS AS ((("qty")::numeric * "price")) STORED,
    CONSTRAINT "order_items_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "order_items_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "shop"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."order_items_id_seq" OWNED BY "shop"."order_items"."id";



CREATE TABLE IF NOT EXISTS "shop"."orders" (
    "id" bigint NOT NULL,
    "customer_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_discount_total_check" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "shop"."orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."orders_id_seq" OWNED BY "shop"."orders"."id";



CREATE TABLE IF NOT EXISTS "shop"."product_images" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "shop"."product_images" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."product_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."product_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."product_images_id_seq" OWNED BY "shop"."product_images"."id";



CREATE OR REPLACE VIEW "shop"."product_ratings_vw" AS
 SELECT "product_id",
    "round"("avg"("rating"), 2) AS "rating_value",
    "count"(*) AS "rating_count"
   FROM "shop"."reviews"
  WHERE ("status" = 'approved'::"text")
  GROUP BY "product_id";


ALTER VIEW "shop"."product_ratings_vw" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."products_id_seq" OWNED BY "shop"."products"."id";



CREATE SEQUENCE IF NOT EXISTS "shop"."promotions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."promotions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."promotions_id_seq" OWNED BY "shop"."promotions"."id";



CREATE SEQUENCE IF NOT EXISTS "shop"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."reviews_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."reviews_id_seq" OWNED BY "shop"."reviews"."id";



CREATE TABLE IF NOT EXISTS "shop"."stock" (
    "variant_id" bigint NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_qty_check" CHECK (("qty" >= 0))
);


ALTER TABLE "shop"."stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "shop"."variants" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "price_override" numeric(10,2),
    "sku" "text"
);


ALTER TABLE "shop"."variants" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "shop"."variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "shop"."variants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "shop"."variants_id_seq" OWNED BY "shop"."variants"."id";



ALTER TABLE ONLY "aff"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"aff"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "aff"."offers" ALTER COLUMN "id" SET DEFAULT "nextval"('"aff"."offers_id_seq"'::"regclass");



ALTER TABLE ONLY "aff"."sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"aff"."sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."orders_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."product_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."product_images_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."promotions" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."promotions_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."reviews" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."reviews_id_seq"'::"regclass");



ALTER TABLE ONLY "shop"."variants" ALTER COLUMN "id" SET DEFAULT "nextval"('"shop"."variants_id_seq"'::"regclass");



ALTER TABLE ONLY "aff"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "aff"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "aff"."offers"
    ADD CONSTRAINT "offers_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "aff"."sources"
    ADD CONSTRAINT "sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("code", "user_id", "redeemed_at");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."ecom_categories"
    ADD CONSTRAINT "ecom_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecom_categories"
    ADD CONSTRAINT "ecom_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecom_wishlist"
    ADD CONSTRAINT "ecom_wishlist_pkey" PRIMARY KEY ("user_id", "product_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."reviews__backup_20250909_181553"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews__backup_20250909_181553"
    ADD CONSTRAINT "reviews_product_id_user_id_key" UNIQUE ("product_id", "user_id");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "shop"."customers"
    ADD CONSTRAINT "customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "shop"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "shop"."promotions"
    ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."stock"
    ADD CONSTRAINT "stock_pkey" PRIMARY KEY ("variant_id");



ALTER TABLE ONLY "shop"."variants"
    ADD CONSTRAINT "variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "shop"."variants"
    ADD CONSTRAINT "variants_sku_key" UNIQUE ("sku");



CREATE INDEX "aff_events_by_type_time" ON "aff"."events" USING "btree" ("event_ts") WHERE ("event_type" = 'click'::"aff"."event_type");



CREATE INDEX "aff_events_clicks_offer_time" ON "aff"."events" USING "btree" ("offer_id", "event_ts") WHERE ("event_type" = 'click'::"aff"."event_type");



CREATE INDEX "aff_events_clicks_time" ON "aff"."events" USING "btree" ("event_ts") WHERE ("event_type" = 'click'::"aff"."event_type");



CREATE INDEX "aff_events_event_ts_brin" ON "aff"."events" USING "brin" ("event_ts") WITH ("pages_per_range"='32');



CREATE INDEX "events_event_type_event_ts_idx" ON "aff"."events" USING "btree" ("event_type", "event_ts");



CREATE INDEX "events_offer_id_event_ts_idx" ON "aff"."events" USING "btree" ("offer_id", "event_ts");



CREATE INDEX "offers_lower_idx" ON "aff"."offers" USING "btree" ("lower"("license"));



CREATE INDEX "audit_created_idx" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "cart_items_cart_idx" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE UNIQUE INDEX "cart_items_unique_no_variant" ON "public"."cart_items" USING "btree" ("cart_id", "product_id") WHERE ("variant_id" IS NULL);



CREATE UNIQUE INDEX "cart_items_unique_with_variant" ON "public"."cart_items" USING "btree" ("cart_id", "product_id", "variant_id") WHERE ("variant_id" IS NOT NULL);



CREATE INDEX "ecom_products_category_idx" ON "public"."ecom_products" USING "btree" ("category_slug");



CREATE INDEX "ecom_products_price_idx" ON "public"."ecom_products" USING "btree" ("price");



CREATE INDEX "ecom_products_rating_idx" ON "public"."ecom_products" USING "btree" ("rating");



CREATE INDEX "ecom_products_title_gin" ON "public"."ecom_products" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("short_desc", ''::"text"))));



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE UNIQUE INDEX "order_items_unique_no_variant" ON "public"."order_items" USING "btree" ("order_id", "product_id") WHERE ("variant_id" IS NULL);



CREATE UNIQUE INDEX "order_items_unique_with_variant" ON "public"."order_items" USING "btree" ("order_id", "product_id", "variant_id") WHERE ("variant_id" IS NOT NULL);



CREATE INDEX "payments_order_idx" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "order_items_order_id_idx" ON "shop"."order_items" USING "btree" ("order_id");



CREATE INDEX "product_images_product_id_sort_order_idx" ON "shop"."product_images" USING "btree" ("product_id", "sort_order");



CREATE UNIQUE INDEX "product_ratings_new_pk" ON "shop"."product_ratings" USING "btree" ("product_id");



CREATE INDEX "promotions_lower_idx" ON "shop"."promotions" USING "btree" ("lower"("coupon_code"));



CREATE INDEX "reviews_product_id_idx" ON "shop"."reviews" USING "btree" ("product_id");



CREATE INDEX "shop_order_items_order_id" ON "shop"."order_items" USING "btree" ("order_id");



CREATE INDEX "shop_products_active_cat_idx" ON "shop"."products" USING "btree" ("is_active", "category_id");



CREATE INDEX "shop_products_search_gin" ON "shop"."products" USING "gin" ("search");



CREATE INDEX "shop_products_title_trgm" ON "shop"."products" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE INDEX "shop_promotions_coupon" ON "shop"."promotions" USING "btree" ("lower"("coupon_code"));



CREATE INDEX "shop_reviews_product_created_idx" ON "shop"."reviews" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "shop_reviews_product_id" ON "shop"."reviews" USING "btree" ("product_id");



CREATE INDEX "shop_reviews_product_status_idx" ON "shop"."reviews" USING "btree" ("product_id", "status");



CREATE INDEX "shop_reviews_status_idx" ON "shop"."reviews" USING "btree" ("status");



CREATE UNIQUE INDEX "uq_products_cat_title" ON "shop"."products" USING "btree" ("category_id", "lower"("title"));



CREATE UNIQUE INDEX "uq_products_sku" ON "shop"."products" USING "btree" ("sku");



CREATE UNIQUE INDEX "uq_products_slug" ON "shop"."products" USING "btree" ("slug");



CREATE UNIQUE INDEX "uq_reviews_product_user" ON "shop"."reviews" USING "btree" ("product_id", "user_id");



CREATE OR REPLACE TRIGGER "_audit_products" AFTER INSERT OR DELETE OR UPDATE ON "shop"."products" FOR EACH ROW EXECUTE FUNCTION "sys"."audit_trigger"();



CREATE OR REPLACE TRIGGER "_ratings_refresh" AFTER INSERT OR DELETE OR UPDATE ON "shop"."reviews" FOR EACH STATEMENT EXECUTE FUNCTION "shop"."refresh_product_ratings"();



CREATE OR REPLACE TRIGGER "_stock_touch" BEFORE UPDATE ON "shop"."stock" FOR EACH ROW EXECUTE FUNCTION "shop"."stock_touch"();



CREATE OR REPLACE TRIGGER "trg_products_autosku_ins" BEFORE INSERT ON "shop"."products" FOR EACH ROW EXECUTE FUNCTION "shop"."products_autosku"();



CREATE OR REPLACE TRIGGER "trg_reviews_rate_limit" BEFORE INSERT OR UPDATE ON "shop"."reviews" FOR EACH ROW EXECUTE FUNCTION "shop"."rate_limit_review"();



CREATE OR REPLACE TRIGGER "trg_reviews_sanitize" BEFORE INSERT OR UPDATE ON "shop"."reviews" FOR EACH ROW EXECUTE FUNCTION "shop"."reviews_sanitize_rating"();



ALTER TABLE ONLY "aff"."events"
    ADD CONSTRAINT "events_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "aff"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "aff"."offers"
    ADD CONSTRAINT "offers_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "aff"."sources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_code_fkey" FOREIGN KEY ("code") REFERENCES "public"."coupons"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecom_products"
    ADD CONSTRAINT "ecom_products_category_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "public"."ecom_categories"("slug") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecom_wishlist"
    ADD CONSTRAINT "ecom_wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews__backup_20250909_181553"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecom_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews__backup_20250909_181553"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "shop"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "shop"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "shop"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop"."products"("id");



ALTER TABLE ONLY "shop"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "shop"."variants"("id");



ALTER TABLE ONLY "shop"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "shop"."customers"("id");



ALTER TABLE ONLY "shop"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "shop"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "shop"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "shop"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "shop"."stock"
    ADD CONSTRAINT "stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "shop"."variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "shop"."variants"
    ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop"."products"("id") ON DELETE CASCADE;



ALTER TABLE "aff"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_insert_via_anon" ON "aff"."events" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_owner" ON "public"."addresses" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_srv_all" ON "public"."audit_log" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_items_owner_all" ON "public"."cart_items" USING ((EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carts_owner_all" ON "public"."carts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupon_redemptions_owner_insert" ON "public"."coupon_redemptions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "coupon_redemptions_owner_read" ON "public"."coupon_redemptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupons_public_read" ON "public"."coupons" FOR SELECT USING ((("active" = true) AND (("valid_from" IS NULL) OR ("now"() >= "valid_from")) AND (("valid_to" IS NULL) OR ("now"() <= "valid_to"))));



CREATE POLICY "coupons_srv_write" ON "public"."coupons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."ecom_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_categories_public_read" ON "public"."ecom_categories" FOR SELECT USING (true);



ALTER TABLE "public"."ecom_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_products_public_read" ON "public"."ecom_products" FOR SELECT USING (true);



ALTER TABLE "public"."ecom_wishlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecom_wishlist_owner_delete" ON "public"."ecom_wishlist" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ecom_wishlist_owner_insert" ON "public"."ecom_wishlist" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ecom_wishlist_owner_read" ON "public"."ecom_wishlist" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_owner_read" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "order_items_srv_write" ON "public"."order_items" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_owner_insert" ON "public"."orders" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "orders_owner_read" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "orders_srv_write" ON "public"."orders" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_owner_read" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "payments_srv_write" ON "public"."payments" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_self_upsert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reviews__backup_20250909_181553" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_owner_read" ON "public"."reviews__backup_20250909_181553" FOR SELECT USING (true);



CREATE POLICY "reviews_owner_write" ON "public"."reviews__backup_20250909_181553" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."shipments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipments_owner_read" ON "public"."shipments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "shipments"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "shipments_srv_write" ON "public"."shipments" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "shop"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "shop"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "shop"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_modify_owner" ON "shop"."orders" TO "authenticated" USING (("auth"."uid"() = "customer_id"));



CREATE POLICY "orders_select_public" ON "shop"."orders" FOR SELECT USING (true);



ALTER TABLE "shop"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shop_orders_modify_owner" ON "shop"."orders" TO "authenticated" USING (("auth"."uid"() = "customer_id")) WITH CHECK (("auth"."uid"() = "customer_id"));



CREATE POLICY "shop_orders_select_public" ON "shop"."orders" FOR SELECT USING (true);



CREATE POLICY "shop_reviews_delete_owner" ON "shop"."reviews" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "shop_reviews_insert_auth" ON "shop"."reviews" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "shop_reviews_moderate_admin" ON "shop"."reviews" FOR UPDATE TO "authenticated" USING ((((COALESCE(NULLIF("current_setting"('request.jwt.claims'::"text", true), ''::"text"), '{}'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((((COALESCE(NULLIF("current_setting"('request.jwt.claims'::"text", true), ''::"text"), '{}'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "shop_reviews_select_public" ON "shop"."reviews" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "shop_reviews_update_owner" ON "shop"."reviews" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";



GRANT USAGE ON SCHEMA "shop" TO "anon";
GRANT USAGE ON SCHEMA "shop" TO "authenticated";



REVOKE ALL ON FUNCTION "aff"."track_event"("p_type" "aff"."event_type", "p_offer_id" bigint, "p_session" "text", "p_ip_hash" "text", "p_ua" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "aff"."track_event"("p_type" "aff"."event_type", "p_offer_id" bigint, "p_session" "text", "p_ip_hash" "text", "p_ua" "text") TO "anon";
GRANT ALL ON FUNCTION "aff"."track_event"("p_type" "aff"."event_type", "p_offer_id" bigint, "p_session" "text", "p_ip_hash" "text", "p_ua" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "shop"."add_review"("p_product_id" bigint, "p_rating" integer, "p_title" "text", "p_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "shop"."add_review"("p_product_id" bigint, "p_rating" integer, "p_title" "text", "p_body" "text") TO "authenticated";



GRANT ALL ON FUNCTION "shop"."compute_price"("p_product_id" bigint, "p_variant_id" bigint, "p_qty" integer, "p_coupon" "text") TO "anon";
GRANT ALL ON FUNCTION "shop"."compute_price"("p_product_id" bigint, "p_variant_id" bigint, "p_qty" integer, "p_coupon" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "shop"."moderate_review"("p_review_id" bigint, "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "shop"."moderate_review"("p_review_id" bigint, "p_status" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "service_role";
GRANT SELECT ON TABLE "public"."categories" TO "anon";
GRANT SELECT ON TABLE "public"."categories" TO "authenticated";



GRANT ALL ON TABLE "public"."coupon_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."coupon_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."ecom_categories" TO "anon";
GRANT ALL ON TABLE "public"."ecom_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ecom_products" TO "anon";
GRANT ALL ON TABLE "public"."ecom_products" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_products" TO "service_role";



GRANT ALL ON TABLE "public"."ecom_wishlist" TO "anon";
GRANT ALL ON TABLE "public"."ecom_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."ecom_wishlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT SELECT ON TABLE "shop"."reviews" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "shop"."reviews" TO "authenticated";



GRANT SELECT ON TABLE "public"."products" TO "anon";
GRANT SELECT ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "service_role";
GRANT SELECT ON TABLE "public"."reviews" TO "anon";
GRANT SELECT ON TABLE "public"."reviews" TO "authenticated";



GRANT ALL ON TABLE "public"."reviews__backup_20250909_181553" TO "anon";
GRANT ALL ON TABLE "public"."reviews__backup_20250909_181553" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews__backup_20250909_181553" TO "service_role";



GRANT ALL ON TABLE "public"."reviews__backup_20250909_181804" TO "anon";
GRANT ALL ON TABLE "public"."reviews__backup_20250909_181804" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews__backup_20250909_181804" TO "service_role";



GRANT ALL ON TABLE "public"."shipments" TO "anon";
GRANT ALL ON TABLE "public"."shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."shipments" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
