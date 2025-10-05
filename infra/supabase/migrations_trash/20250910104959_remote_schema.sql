create schema if not exists "aff";

create type "aff"."event_type" as enum ('impression', 'click', 'purchase');

create type "aff"."placement_tier" as enum ('gold', 'silver', 'bronze');

create sequence "aff"."events_id_seq";

create sequence "aff"."offers_id_seq";

create sequence "aff"."sources_id_seq";


  create table "aff"."events" (
    "id" bigint not null default nextval('aff.events_id_seq'::regclass),
    "event_type" aff.event_type not null,
    "offer_id" bigint not null,
    "session_id" text,
    "ip_hash" text,
    "user_agent" text,
    "event_ts" timestamp with time zone not null default now()
      );


alter table "aff"."events" enable row level security;


  create table "aff"."offers" (
    "id" bigint not null default nextval('aff.offers_id_seq'::regclass),
    "source_id" bigint,
    "slug" text not null,
    "title" text not null,
    "affiliate_url" text,
    "country" text,
    "license" text,
    "payout_hours" integer,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );



  create table "aff"."sources" (
    "id" bigint not null default nextval('aff.sources_id_seq'::regclass),
    "name" text not null,
    "base_url" text
      );


alter sequence "aff"."events_id_seq" owned by "aff"."events"."id";

alter sequence "aff"."offers_id_seq" owned by "aff"."offers"."id";

alter sequence "aff"."sources_id_seq" owned by "aff"."sources"."id";
-- включаем расширение один раз в начале миграции
create extension if not exists citext schema public;

drop domain if exists public.currency_code cascade;

-- create domain "public"."currency_code"
-- as character(3)
-- null
-- CHECK (VALUE ~ '^[A-Z]{3}$'::text);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'currency_code' and n.nspname = 'public'
  ) then
    create domain public.currency_code as character(3)
      check (value ~ '^[A-Z]{3}$');
  end if;
end$$;

CREATE INDEX aff_events_by_type_time ON aff.events USING btree (event_ts) WHERE (event_type = 'click'::aff.event_type);

CREATE INDEX aff_events_clicks_offer_time ON aff.events USING btree (offer_id, event_ts) WHERE (event_type = 'click'::aff.event_type);

CREATE INDEX aff_events_clicks_time ON aff.events USING btree (event_ts) WHERE (event_type = 'click'::aff.event_type);

CREATE INDEX aff_events_event_ts_brin ON aff.events USING brin (event_ts) WITH (pages_per_range='32');

CREATE INDEX events_event_type_event_ts_idx ON aff.events USING btree (event_type, event_ts);

CREATE INDEX events_offer_id_event_ts_idx ON aff.events USING btree (offer_id, event_ts);

CREATE UNIQUE INDEX events_pkey ON aff.events USING btree (id);

CREATE INDEX offers_lower_idx ON aff.offers USING btree (lower(license));

CREATE UNIQUE INDEX offers_pkey ON aff.offers USING btree (id);

CREATE UNIQUE INDEX offers_slug_key ON aff.offers USING btree (slug);

CREATE UNIQUE INDEX sources_pkey ON aff.sources USING btree (id);

alter table "aff"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "aff"."offers" add constraint "offers_pkey" PRIMARY KEY using index "offers_pkey";

alter table "aff"."sources" add constraint "sources_pkey" PRIMARY KEY using index "sources_pkey";

alter table "aff"."events" add constraint "events_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES aff.offers(id) ON DELETE CASCADE not valid;

alter table "aff"."events" validate constraint "events_offer_id_fkey";

alter table "aff"."offers" add constraint "offers_slug_key" UNIQUE using index "offers_slug_key";

alter table "aff"."offers" add constraint "offers_source_id_fkey" FOREIGN KEY (source_id) REFERENCES aff.sources(id) ON DELETE SET NULL not valid;

alter table "aff"."offers" validate constraint "offers_source_id_fkey";

create or replace view "aff"."offer_stats_30d" as  WITH base AS (
         SELECT events.offer_id,
            sum(((events.event_type = 'impression'::aff.event_type))::integer) AS impressions,
            sum(((events.event_type = 'click'::aff.event_type))::integer) AS clicks,
            sum(((events.event_type = 'purchase'::aff.event_type))::integer) AS purchases
           FROM aff.events
          WHERE (events.event_ts >= (now() - '30 days'::interval))
          GROUP BY events.offer_id
        )
 SELECT offer_id,
    impressions,
    clicks,
    purchases,
        CASE
            WHEN (impressions > 0) THEN round(((100.0 * (clicks)::numeric) / (impressions)::numeric), 2)
            ELSE (0)::numeric
        END AS ctr_pct
   FROM base b;



  create policy "events_insert_via_anon"
  on "aff"."events"
  as permissive
  for insert
  to anon
with check (true);


drop extension if exists "pg_net";

-- включаем расширение один раз в начале миграции
create extension if not exists citext schema public;

drop domain if exists public.currency_code cascade;

-- create domain "public"."currency_code"
-- as character(3)
-- null
-- CHECK (VALUE ~ '^[A-Z]{3}$'::text);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'currency_code' and n.nspname = 'public'
  ) then
    create domain public.currency_code as character(3)
      check (value ~ '^[A-Z]{3}$');
  end if;
end$$;

-- create domain "public"."email_citext"
-- as citext
-- null
-- CHECK (POSITION(('@'::text) IN (VALUE)) > 1);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'email_citext' and n.nspname = 'public'
  ) then
    create domain public.email_citext as citext
      check (position('@' in value) > 1);
  end if;
end$$;


create extension if not exists "btree_gin" with schema "public";

create extension if not exists "citext" with schema "public";

create extension if not exists "pg_trgm" with schema "public";

create sequence "public"."audit_log_id_seq";

create sequence "public"."offers_id_seq";

revoke delete on table "public"."ecom_categories" from "anon";

revoke insert on table "public"."ecom_categories" from "anon";

revoke references on table "public"."ecom_categories" from "anon";

revoke select on table "public"."ecom_categories" from "anon";

revoke trigger on table "public"."ecom_categories" from "anon";

revoke truncate on table "public"."ecom_categories" from "anon";

revoke update on table "public"."ecom_categories" from "anon";

revoke delete on table "public"."ecom_categories" from "authenticated";

revoke insert on table "public"."ecom_categories" from "authenticated";

revoke references on table "public"."ecom_categories" from "authenticated";

revoke select on table "public"."ecom_categories" from "authenticated";

revoke trigger on table "public"."ecom_categories" from "authenticated";

revoke truncate on table "public"."ecom_categories" from "authenticated";

revoke update on table "public"."ecom_categories" from "authenticated";

revoke delete on table "public"."ecom_categories" from "service_role";

revoke insert on table "public"."ecom_categories" from "service_role";

revoke references on table "public"."ecom_categories" from "service_role";

revoke select on table "public"."ecom_categories" from "service_role";

revoke trigger on table "public"."ecom_categories" from "service_role";

revoke truncate on table "public"."ecom_categories" from "service_role";

revoke update on table "public"."ecom_categories" from "service_role";

revoke delete on table "public"."ecom_products" from "anon";

revoke insert on table "public"."ecom_products" from "anon";

revoke references on table "public"."ecom_products" from "anon";

revoke select on table "public"."ecom_products" from "anon";

revoke trigger on table "public"."ecom_products" from "anon";

revoke truncate on table "public"."ecom_products" from "anon";

revoke update on table "public"."ecom_products" from "anon";

revoke delete on table "public"."ecom_products" from "authenticated";

revoke insert on table "public"."ecom_products" from "authenticated";

revoke references on table "public"."ecom_products" from "authenticated";

revoke select on table "public"."ecom_products" from "authenticated";

revoke trigger on table "public"."ecom_products" from "authenticated";

revoke truncate on table "public"."ecom_products" from "authenticated";

revoke update on table "public"."ecom_products" from "authenticated";

revoke delete on table "public"."ecom_products" from "service_role";

revoke insert on table "public"."ecom_products" from "service_role";

revoke references on table "public"."ecom_products" from "service_role";

revoke select on table "public"."ecom_products" from "service_role";

revoke trigger on table "public"."ecom_products" from "service_role";

revoke truncate on table "public"."ecom_products" from "service_role";

revoke update on table "public"."ecom_products" from "service_role";

revoke delete on table "public"."ecom_wishlist" from "anon";

revoke insert on table "public"."ecom_wishlist" from "anon";

revoke references on table "public"."ecom_wishlist" from "anon";

revoke select on table "public"."ecom_wishlist" from "anon";

revoke trigger on table "public"."ecom_wishlist" from "anon";

revoke truncate on table "public"."ecom_wishlist" from "anon";

revoke update on table "public"."ecom_wishlist" from "anon";

revoke delete on table "public"."ecom_wishlist" from "authenticated";

revoke insert on table "public"."ecom_wishlist" from "authenticated";

revoke references on table "public"."ecom_wishlist" from "authenticated";

revoke select on table "public"."ecom_wishlist" from "authenticated";

revoke trigger on table "public"."ecom_wishlist" from "authenticated";

revoke truncate on table "public"."ecom_wishlist" from "authenticated";

revoke update on table "public"."ecom_wishlist" from "authenticated";

revoke delete on table "public"."ecom_wishlist" from "service_role";

revoke insert on table "public"."ecom_wishlist" from "service_role";

revoke references on table "public"."ecom_wishlist" from "service_role";

revoke select on table "public"."ecom_wishlist" from "service_role";

revoke trigger on table "public"."ecom_wishlist" from "service_role";

revoke truncate on table "public"."ecom_wishlist" from "service_role";

revoke update on table "public"."ecom_wishlist" from "service_role";


  create table "public"."addresses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "kind" text not null default 'shipping'::text,
    "name" text,
    "line1" text not null,
    "line2" text,
    "city" text not null,
    "postal_code" text not null,
    "country" text not null default 'DE'::text,
    "phone" text,
    "is_default" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."addresses" enable row level security;


  create table "public"."audit_log" (
    "id" bigint not null default nextval('audit_log_id_seq'::regclass),
    "actor" uuid,
    "action" text not null,
    "entity" text not null,
    "payload" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_log" enable row level security;


  create table "public"."cart_items" (
    "id" uuid not null default gen_random_uuid(),
    "cart_id" uuid not null,
    "product_id" uuid not null,
    "variant_id" uuid,
    "qty" integer not null,
    "price_at_add" numeric(10,2) not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."cart_items" enable row level security;


  create table "public"."carts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."carts" enable row level security;


  create table "public"."coupon_redemptions" (
    "code" text not null,
    "user_id" uuid not null,
    "order_id" uuid,
    "redeemed_at" timestamp with time zone not null default now()
      );


alter table "public"."coupon_redemptions" enable row level security;


  create table "public"."coupons" (
    "code" text not null,
    "kind" text not null default 'percent'::text,
    "value" numeric(10,2) not null,
    "active" boolean not null default true,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "max_redemptions" integer,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."coupons" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid,
    "variant_id" uuid,
    "title" text not null,
    "qty" integer not null,
    "unit_price" numeric(10,2) not null,
    "total" numeric(10,2) generated always as (((qty)::numeric * unit_price)) stored
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "status" text not null default 'pending'::text,
    "subtotal" numeric(10,2) not null default 0,
    "discount_total" numeric(10,2) not null default 0,
    "shipping_total" numeric(10,2) not null default 0,
    "grand_total" numeric(10,2) not null default 0,
    "currency" text not null default 'EUR'::text,
    "created_at" timestamp with time zone not null default now(),
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
      );


alter table "public"."orders" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid,
    "provider" text not null,
    "provider_ref" text,
    "amount" numeric(10,2) not null,
    "currency" text not null default 'EUR'::text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."payments" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."reviews__backup_20250909_181553" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid,
    "user_id" uuid,
    "rating" integer not null,
    "content" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."reviews__backup_20250909_181553" enable row level security;


  create table "public"."shipments" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid,
    "carrier" text,
    "tracking_number" text,
    "status" text not null default 'ready'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."shipments" enable row level security;

alter sequence "public"."audit_log_id_seq" owned by "public"."audit_log"."id";

-- включаем расширение один раз в начале миграции
create extension if not exists citext schema public;

drop domain if exists public.currency_code cascade;

-- create domain "public"."currency_code"
-- as character(3)
-- null
-- CHECK (VALUE ~ '^[A-Z]{3}$'::text);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'currency_code' and n.nspname = 'public'
  ) then
    create domain public.currency_code as character(3)
      check (value ~ '^[A-Z]{3}$');
  end if;
end$$;

-- create domain "public"."email_citext"
-- as citext
-- null
-- CHECK (POSITION(('@'::text) IN (VALUE)) > 1);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'email_citext' and n.nspname = 'public'
  ) then
    create domain public.email_citext as citext
      check (position('@' in value) > 1);
  end if;
end$$;

CREATE UNIQUE INDEX addresses_pkey ON public.addresses USING btree (id);

CREATE INDEX audit_created_idx ON public.audit_log USING btree (created_at DESC);

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE INDEX cart_items_cart_idx ON public.cart_items USING btree (cart_id);

CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id);

CREATE UNIQUE INDEX cart_items_unique_no_variant ON public.cart_items USING btree (cart_id, product_id) WHERE (variant_id IS NULL);

CREATE UNIQUE INDEX cart_items_unique_with_variant ON public.cart_items USING btree (cart_id, product_id, variant_id) WHERE (variant_id IS NOT NULL);

CREATE UNIQUE INDEX carts_pkey ON public.carts USING btree (id);

CREATE UNIQUE INDEX coupon_redemptions_pkey ON public.coupon_redemptions USING btree (code, user_id, redeemed_at);

CREATE UNIQUE INDEX coupons_pkey ON public.coupons USING btree (code);

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX order_items_unique_no_variant ON public.order_items USING btree (order_id, product_id) WHERE (variant_id IS NULL);

CREATE UNIQUE INDEX order_items_unique_with_variant ON public.order_items USING btree (order_id, product_id, variant_id) WHERE (variant_id IS NOT NULL);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE INDEX payments_order_idx ON public.payments USING btree (order_id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews__backup_20250909_181553 USING btree (id);

CREATE UNIQUE INDEX reviews_product_id_user_id_key ON public.reviews__backup_20250909_181553 USING btree (product_id, user_id);

CREATE UNIQUE INDEX shipments_pkey ON public.shipments USING btree (id);

alter table "public"."addresses" add constraint "addresses_pkey" PRIMARY KEY using index "addresses_pkey";

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "public"."cart_items" add constraint "cart_items_pkey" PRIMARY KEY using index "cart_items_pkey";

alter table "public"."carts" add constraint "carts_pkey" PRIMARY KEY using index "carts_pkey";

alter table "public"."coupon_redemptions" add constraint "coupon_redemptions_pkey" PRIMARY KEY using index "coupon_redemptions_pkey";

alter table "public"."coupons" add constraint "coupons_pkey" PRIMARY KEY using index "coupons_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."reviews__backup_20250909_181553" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."shipments" add constraint "shipments_pkey" PRIMARY KEY using index "shipments_pkey";

alter table "public"."addresses" add constraint "addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."addresses" validate constraint "addresses_user_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_cart_id_fkey" FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_cart_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES ecom_products(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_product_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_qty_check" CHECK ((qty > 0)) not valid;

alter table "public"."cart_items" validate constraint "cart_items_qty_check";

alter table "public"."carts" add constraint "carts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."carts" validate constraint "carts_user_id_fkey";

alter table "public"."coupon_redemptions" add constraint "coupon_redemptions_code_fkey" FOREIGN KEY (code) REFERENCES coupons(code) ON DELETE CASCADE not valid;

alter table "public"."coupon_redemptions" validate constraint "coupon_redemptions_code_fkey";

alter table "public"."coupon_redemptions" add constraint "coupon_redemptions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL not valid;

alter table "public"."coupon_redemptions" validate constraint "coupon_redemptions_order_id_fkey";

alter table "public"."coupon_redemptions" add constraint "coupon_redemptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."coupon_redemptions" validate constraint "coupon_redemptions_user_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES ecom_products(id) not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_items" add constraint "order_items_qty_check" CHECK ((qty > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_qty_check";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_order_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."reviews__backup_20250909_181553" add constraint "reviews_product_id_fkey" FOREIGN KEY (product_id) REFERENCES ecom_products(id) ON DELETE CASCADE not valid;

alter table "public"."reviews__backup_20250909_181553" validate constraint "reviews_product_id_fkey";

alter table "public"."reviews__backup_20250909_181553" add constraint "reviews_product_id_user_id_key" UNIQUE using index "reviews_product_id_user_id_key";

alter table "public"."reviews__backup_20250909_181553" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."reviews__backup_20250909_181553" validate constraint "reviews_rating_check";

alter table "public"."reviews__backup_20250909_181553" add constraint "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reviews__backup_20250909_181553" validate constraint "reviews_user_id_fkey";

alter table "public"."shipments" add constraint "shipments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."shipments" validate constraint "shipments_order_id_fkey";

create or replace view "public"."categories" as  SELECT id,
    slug,
    name
   FROM shop.categories;




create or replace view "public"."products" as  SELECT p.id,
    c.slug,
    p.title,
    p.description,
    p.price,
    c.name AS category,
    COALESCE(pr.rating_value, (0)::numeric) AS rating,
    COALESCE(pr.rating_count, (0)::bigint) AS rating_count
   FROM ((shop.products p
     LEFT JOIN shop.categories c ON ((c.id = p.category_id)))
     LEFT JOIN shop.product_ratings pr ON ((pr.product_id = p.id)))
  WHERE (p.is_active = true);


create or replace view "public"."reviews" as  SELECT id,
    product_id,
    rating,
    title,
    body,
    created_at
   FROM shop.reviews r;


create or replace view "public"."reviews__backup_20250909_181804" as  SELECT id,
    product_id,
    rating,
    title,
    body,
    created_at
   FROM shop.reviews r;



  create policy "addresses_owner"
  on "public"."addresses"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "audit_srv_all"
  on "public"."audit_log"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "cart_items_owner_all"
  on "public"."cart_items"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = auth.uid())))));



  create policy "carts_owner_all"
  on "public"."carts"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "coupon_redemptions_owner_insert"
  on "public"."coupon_redemptions"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));



  create policy "coupon_redemptions_owner_read"
  on "public"."coupon_redemptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "coupons_public_read"
  on "public"."coupons"
  as permissive
  for select
  to public
using (((active = true) AND ((valid_from IS NULL) OR (now() >= valid_from)) AND ((valid_to IS NULL) OR (now() <= valid_to))));



  create policy "coupons_srv_write"
  on "public"."coupons"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "order_items_owner_read"
  on "public"."order_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));



  create policy "order_items_srv_write"
  on "public"."order_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "orders_owner_insert"
  on "public"."orders"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));



  create policy "orders_owner_read"
  on "public"."orders"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "orders_srv_write"
  on "public"."orders"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "payments_owner_read"
  on "public"."payments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = auth.uid())))));



  create policy "payments_srv_write"
  on "public"."payments"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "profiles_self_read"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "profiles_self_update"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "profiles_self_upsert"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "reviews_owner_read"
  on "public"."reviews__backup_20250909_181553"
  as permissive
  for select
  to public
using (true);



  create policy "reviews_owner_write"
  on "public"."reviews__backup_20250909_181553"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "shipments_owner_read"
  on "public"."shipments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = shipments.order_id) AND (o.user_id = auth.uid())))));



  create policy "shipments_srv_write"
  on "public"."shipments"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create schema if not exists "shop";

create type "shop"."promo_type" as enum ('percent', 'fixed');

create sequence "shop"."categories_id_seq";

create sequence "shop"."order_items_id_seq";

create sequence "shop"."orders_id_seq";

create sequence "shop"."product_images_id_seq";

create sequence "shop"."products_id_seq";

create sequence "shop"."promotions_id_seq";

create sequence "shop"."reviews_id_seq";

create sequence "shop"."variants_id_seq";


  create table "shop"."categories" (
    "id" bigint not null default nextval('shop.categories_id_seq'::regclass),
    "slug" text not null,
    "name" text not null
      );


alter table "shop"."categories" enable row level security;


  create table "shop"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "shop"."order_items" (
    "id" bigint not null default nextval('shop.order_items_id_seq'::regclass),
    "order_id" bigint not null,
    "product_id" bigint not null,
    "variant_id" bigint,
    "qty" integer not null,
    "price" numeric(10,2) not null,
    "line_total" numeric(10,2) generated always as (((qty)::numeric * price)) stored
      );


alter table "shop"."order_items" enable row level security;


  create table "shop"."orders" (
    "id" bigint not null default nextval('shop.orders_id_seq'::regclass),
    "customer_id" uuid,
    "status" text not null default 'pending'::text,
    "subtotal" numeric(10,2) not null,
    "discount_total" numeric(10,2) not null default 0,
    "total" numeric(10,2) not null,
    "currency" text not null default 'EUR'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "shop"."orders" enable row level security;


  create table "shop"."product_images" (
    "id" bigint not null default nextval('shop.product_images_id_seq'::regclass),
    "product_id" bigint not null,
    "url" text not null,
    "sort_order" integer not null default 0
      );



  create table "shop"."products" (
    "id" bigint not null default nextval('shop.products_id_seq'::regclass),
    "sku" text not null,
    "title" text not null,
    "description" text,
    "price" numeric(10,2) not null,
    "currency" text not null default 'EUR'::text,
    "category_id" bigint,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "search" tsvector generated always as ((setweight(to_tsvector('simple'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(description, ''::text)), 'B'::"char"))) stored,
    "slug" text
      );



  create table "shop"."promotions" (
    "id" bigint not null default nextval('shop.promotions_id_seq'::regclass),
    "name" text not null,
    "type" shop.promo_type not null,
    "value" numeric(10,2) not null,
    "starts_at" timestamp with time zone not null default now(),
    "ends_at" timestamp with time zone,
    "coupon_code" text,
    "is_stackable" boolean not null default false,
    "conditions" jsonb not null default '{}'::jsonb
      );



  create table "shop"."reviews" (
    "id" bigint not null default nextval('shop.reviews_id_seq'::regclass),
    "product_id" bigint not null,
    "user_id" uuid not null,
    "rating" integer not null,
    "title" text,
    "body" text,
    "created_at" timestamp with time zone not null default now(),
    "status" text not null default 'pending'::text
      );


alter table "shop"."reviews" enable row level security;


  create table "shop"."stock" (
    "variant_id" bigint not null,
    "qty" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "shop"."variants" (
    "id" bigint not null default nextval('shop.variants_id_seq'::regclass),
    "product_id" bigint not null,
    "name" text not null,
    "price_override" numeric(10,2),
    "sku" text
      );


alter sequence "shop"."categories_id_seq" owned by "shop"."categories"."id";

alter sequence "shop"."order_items_id_seq" owned by "shop"."order_items"."id";

alter sequence "shop"."orders_id_seq" owned by "shop"."orders"."id";

alter sequence "shop"."product_images_id_seq" owned by "shop"."product_images"."id";

alter sequence "shop"."products_id_seq" owned by "shop"."products"."id";

alter sequence "shop"."promotions_id_seq" owned by "shop"."promotions"."id";

alter sequence "shop"."reviews_id_seq" owned by "shop"."reviews"."id";

alter sequence "shop"."variants_id_seq" owned by "shop"."variants"."id";

-- включаем расширение один раз в начале миграции
create extension if not exists citext schema public;

-- drop domain if exists public.currency_code cascade;

-- create domain "public"."currency_code"
-- as character(3)
-- null
-- CHECK (VALUE ~ '^[A-Z]{3}$'::text);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'currency_code' and n.nspname = 'public'
  ) then
    create domain public.currency_code as character(3)
      check (value ~ '^[A-Z]{3}$');
  end if;
end$$;

-- create domain "public"."email_citext"
-- as citext
-- null
-- CHECK (POSITION(('@'::text) IN (VALUE)) > 1);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'email_citext' and n.nspname = 'public'
  ) then
    create domain public.email_citext as citext
      check (position('@' in value) > 1);
  end if;
end$$;

CREATE UNIQUE INDEX categories_pkey ON shop.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON shop.categories USING btree (slug);

CREATE UNIQUE INDEX customers_email_key ON shop.customers USING btree (email);

CREATE UNIQUE INDEX customers_pkey ON shop.customers USING btree (id);

CREATE INDEX order_items_order_id_idx ON shop.order_items USING btree (order_id);

CREATE UNIQUE INDEX order_items_pkey ON shop.order_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON shop.orders USING btree (id);

CREATE UNIQUE INDEX product_images_pkey ON shop.product_images USING btree (id);

CREATE INDEX product_images_product_id_sort_order_idx ON shop.product_images USING btree (product_id, sort_order);

CREATE UNIQUE INDEX products_pkey ON shop.products USING btree (id);

CREATE UNIQUE INDEX products_sku_key ON shop.products USING btree (sku);

CREATE INDEX promotions_lower_idx ON shop.promotions USING btree (lower(coupon_code));

CREATE UNIQUE INDEX promotions_pkey ON shop.promotions USING btree (id);

CREATE UNIQUE INDEX reviews_pkey ON shop.reviews USING btree (id);

CREATE INDEX reviews_product_id_idx ON shop.reviews USING btree (product_id);

CREATE INDEX shop_order_items_order_id ON shop.order_items USING btree (order_id);

CREATE INDEX shop_products_active_cat_idx ON shop.products USING btree (is_active, category_id);

CREATE INDEX shop_products_search_gin ON shop.products USING gin (search);

CREATE INDEX shop_products_title_trgm ON shop.products USING gin (title gin_trgm_ops);

CREATE INDEX shop_promotions_coupon ON shop.promotions USING btree (lower(coupon_code));

CREATE INDEX shop_reviews_product_created_idx ON shop.reviews USING btree (product_id, created_at DESC);

CREATE INDEX shop_reviews_product_id ON shop.reviews USING btree (product_id);

CREATE INDEX shop_reviews_product_status_idx ON shop.reviews USING btree (product_id, status);

CREATE INDEX shop_reviews_status_idx ON shop.reviews USING btree (status);

CREATE UNIQUE INDEX stock_pkey ON shop.stock USING btree (variant_id);

CREATE UNIQUE INDEX uq_products_cat_title ON shop.products USING btree (category_id, lower(title));

CREATE UNIQUE INDEX uq_products_sku ON shop.products USING btree (sku);

CREATE UNIQUE INDEX uq_products_slug ON shop.products USING btree (slug);

CREATE UNIQUE INDEX uq_reviews_product_user ON shop.reviews USING btree (product_id, user_id);

CREATE UNIQUE INDEX variants_pkey ON shop.variants USING btree (id);

CREATE UNIQUE INDEX variants_sku_key ON shop.variants USING btree (sku);

alter table "shop"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "shop"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "shop"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "shop"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "shop"."product_images" add constraint "product_images_pkey" PRIMARY KEY using index "product_images_pkey";

alter table "shop"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "shop"."promotions" add constraint "promotions_pkey" PRIMARY KEY using index "promotions_pkey";

alter table "shop"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "shop"."stock" add constraint "stock_pkey" PRIMARY KEY using index "stock_pkey";

alter table "shop"."variants" add constraint "variants_pkey" PRIMARY KEY using index "variants_pkey";

alter table "shop"."categories" add constraint "categories_slug_check" CHECK ((slug ~ '^[a-z0-9-]+$'::text)) not valid;

alter table "shop"."categories" validate constraint "categories_slug_check";

alter table "shop"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "shop"."customers" add constraint "customers_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)) not valid;

alter table "shop"."customers" validate constraint "customers_email_check";

alter table "shop"."customers" add constraint "customers_email_key" UNIQUE using index "customers_email_key";

alter table "shop"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES shop.orders(id) ON DELETE CASCADE not valid;

alter table "shop"."order_items" validate constraint "order_items_order_id_fkey";

alter table "shop"."order_items" add constraint "order_items_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "shop"."order_items" validate constraint "order_items_price_check";

alter table "shop"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES shop.products(id) not valid;

alter table "shop"."order_items" validate constraint "order_items_product_id_fkey";

alter table "shop"."order_items" add constraint "order_items_qty_check" CHECK ((qty > 0)) not valid;

alter table "shop"."order_items" validate constraint "order_items_qty_check";

alter table "shop"."order_items" add constraint "order_items_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES shop.variants(id) not valid;

alter table "shop"."order_items" validate constraint "order_items_variant_id_fkey";

alter table "shop"."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES shop.customers(id) not valid;

alter table "shop"."orders" validate constraint "orders_customer_id_fkey";

alter table "shop"."orders" add constraint "orders_discount_total_check" CHECK ((discount_total >= (0)::numeric)) not valid;

alter table "shop"."orders" validate constraint "orders_discount_total_check";

alter table "shop"."orders" add constraint "orders_subtotal_check" CHECK ((subtotal >= (0)::numeric)) not valid;

alter table "shop"."orders" validate constraint "orders_subtotal_check";

alter table "shop"."orders" add constraint "orders_total_check" CHECK ((total >= (0)::numeric)) not valid;

alter table "shop"."orders" validate constraint "orders_total_check";

alter table "shop"."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE not valid;

alter table "shop"."product_images" validate constraint "product_images_product_id_fkey";

alter table "shop"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES shop.categories(id) ON DELETE SET NULL not valid;

alter table "shop"."products" validate constraint "products_category_id_fkey";

alter table "shop"."products" add constraint "products_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "shop"."products" validate constraint "products_price_check";

alter table "shop"."products" add constraint "products_sku_key" UNIQUE using index "products_sku_key";

alter table "shop"."promotions" add constraint "promotions_value_check" CHECK ((value >= (0)::numeric)) not valid;

alter table "shop"."promotions" validate constraint "promotions_value_check";

alter table "shop"."reviews" add constraint "reviews_product_id_fkey" FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE not valid;

alter table "shop"."reviews" validate constraint "reviews_product_id_fkey";

alter table "shop"."reviews" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "shop"."reviews" validate constraint "reviews_rating_check";

alter table "shop"."reviews" add constraint "reviews_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "shop"."reviews" validate constraint "reviews_status_check";

alter table "shop"."stock" add constraint "stock_qty_check" CHECK ((qty >= 0)) not valid;

alter table "shop"."stock" validate constraint "stock_qty_check";

alter table "shop"."stock" add constraint "stock_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES shop.variants(id) ON DELETE CASCADE not valid;

alter table "shop"."stock" validate constraint "stock_variant_id_fkey";

alter table "shop"."variants" add constraint "variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE not valid;

alter table "shop"."variants" validate constraint "variants_product_id_fkey";

alter table "shop"."variants" add constraint "variants_sku_key" UNIQUE using index "variants_sku_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION shop.active_promotions(now_ts timestamp with time zone DEFAULT now())
 RETURNS SETOF shop.promotions
 LANGUAGE sql
 STABLE
AS $function$
  select *
  from shop.promotions p
  where p.starts_at <= now_ts
    and (p.ends_at is null or p.ends_at >= now_ts)
$function$
;

CREATE OR REPLACE FUNCTION shop.compute_price(p_product_id bigint, p_variant_id bigint DEFAULT NULL::bigint, p_qty integer DEFAULT 1, p_coupon text DEFAULT NULL::text)
 RETURNS TABLE(final_price numeric, applied jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
end $function$
;

create materialized view "shop"."product_ratings" as  SELECT product_id,
    round(avg(rating), 2) AS rating_value,
    count(*) AS rating_count
   FROM shop.reviews
  WHERE (status = 'approved'::text)
  GROUP BY product_id;


create or replace view "shop"."product_ratings_vw" as  SELECT product_id,
    round(avg(rating), 2) AS rating_value,
    count(*) AS rating_count
   FROM shop.reviews
  WHERE (status = 'approved'::text)
  GROUP BY product_id;


CREATE OR REPLACE FUNCTION shop.products_autosku()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.sku is null or length(btrim(new.sku)) = 0 then
    new.sku := 'SKU-' || coalesce(new.id, nextval(pg_get_serial_sequence('shop.products','id')));
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION shop.rate_limit_review()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION shop.refresh_product_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  refresh materialized view concurrently shop.product_ratings;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION shop.refresh_product_ratings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'shop'
AS $function$
begin
  refresh materialized view shop.product_ratings;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION shop.reviews_sanitize_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.rating < 1 then new.rating := 1; end if;
  if new.rating > 5 then new.rating := 5; end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION shop.stock_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION shop.touch_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end $function$
;

CREATE UNIQUE INDEX product_ratings_new_pk ON shop.product_ratings USING btree (product_id);


  create policy "orders_modify_owner"
  on "shop"."orders"
  as permissive
  for all
  to authenticated
using ((auth.uid() = customer_id));



  create policy "orders_select_public"
  on "shop"."orders"
  as permissive
  for select
  to public
using (true);



  create policy "shop_orders_modify_owner"
  on "shop"."orders"
  as permissive
  for all
  to authenticated
using ((auth.uid() = customer_id))
with check ((auth.uid() = customer_id));



  create policy "shop_orders_select_public"
  on "shop"."orders"
  as permissive
  for select
  to public
using (true);



  create policy "shop_reviews_delete_owner"
  on "shop"."reviews"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = user_id) AND (status = 'pending'::text)));



  create policy "shop_reviews_insert_auth"
  on "shop"."reviews"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "shop_reviews_moderate_admin"
  on "shop"."reviews"
  as permissive
  for update
  to authenticated
using ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text))
with check ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text));



  create policy "shop_reviews_select_public"
  on "shop"."reviews"
  as permissive
  for select
  to public
using ((status = 'approved'::text));



  create policy "shop_reviews_update_owner"
  on "shop"."reviews"
  as permissive
  for update
  to authenticated
using (((auth.uid() = user_id) AND (status = 'pending'::text)))
with check (((auth.uid() = user_id) AND (status = 'pending'::text)));


CREATE TRIGGER _audit_products AFTER INSERT OR DELETE OR UPDATE ON shop.products FOR EACH ROW EXECUTE FUNCTION sys.audit_trigger();

CREATE TRIGGER trg_products_autosku_ins BEFORE INSERT ON shop.products FOR EACH ROW EXECUTE FUNCTION shop.products_autosku();

CREATE TRIGGER _ratings_refresh AFTER INSERT OR DELETE OR UPDATE ON shop.reviews FOR EACH STATEMENT EXECUTE FUNCTION shop.refresh_product_ratings();

CREATE TRIGGER trg_reviews_rate_limit BEFORE INSERT OR UPDATE ON shop.reviews FOR EACH ROW EXECUTE FUNCTION shop.rate_limit_review();

CREATE TRIGGER trg_reviews_sanitize BEFORE INSERT OR UPDATE ON shop.reviews FOR EACH ROW EXECUTE FUNCTION shop.reviews_sanitize_rating();

CREATE TRIGGER _stock_touch BEFORE UPDATE ON shop.stock FOR EACH ROW EXECUTE FUNCTION shop.stock_touch();

create schema if not exists "sys";

create sequence "sys"."audit_log_id_seq";

create sequence "sys"."webhook_logs_id_seq";


  create table "sys"."audit_log" (
    "id" bigint not null default nextval('sys.audit_log_id_seq'::regclass),
    "ts" timestamp with time zone not null default now(),
    "tbl" text not null,
    "op" text not null,
    "row_before" jsonb,
    "row_after" jsonb,
    "actor" uuid,
    "ip" text
      );



  create table "sys"."settings" (
    "key" text not null,
    "value" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "sys"."webhook_logs" (
    "id" bigint not null default nextval('sys.webhook_logs_id_seq'::regclass),
    "ts" timestamp with time zone not null default now(),
    "source" text not null,
    "status" integer not null,
    "payload" jsonb,
    "response" jsonb
      );


alter table "sys"."webhook_logs" enable row level security;

alter sequence "sys"."audit_log_id_seq" owned by "sys"."audit_log"."id";

alter sequence "sys"."webhook_logs_id_seq" owned by "sys"."webhook_logs"."id";

-- включаем расширение один раз в начале миграции
create extension if not exists citext schema public;

drop domain if exists public.currency_code cascade;

-- create domain "public"."currency_code"
-- as character(3)
-- null
-- CHECK (VALUE ~ '^[A-Z]{3}$'::text);
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'currency_code' and n.nspname = 'public'
  ) then
    create domain public.currency_code as character(3)
      check (value ~ '^[A-Z]{3}$');
  end if;
end$$;

-- create domain "public"."email_citext"
-- as citext
-- null
-- CHECK (POSITION(('@'::text) IN (VALUE)) > 1);


do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'email_citext' and n.nspname = 'public'
  ) then
    create domain public.email_citext as citext
      check (position('@' in value) > 1);
  end if;
end$$;

CREATE UNIQUE INDEX audit_log_pkey ON sys.audit_log USING btree (id);

CREATE UNIQUE INDEX settings_pkey ON sys.settings USING btree (key);

CREATE UNIQUE INDEX webhook_logs_pkey ON sys.webhook_logs USING btree (id);

alter table "sys"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "sys"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "sys"."webhook_logs" add constraint "webhook_logs_pkey" PRIMARY KEY using index "webhook_logs_pkey";

alter table "sys"."audit_log" add constraint "audit_log_op_check" CHECK ((op = ANY (ARRAY['I'::text, 'U'::text, 'D'::text]))) not valid;

alter table "sys"."audit_log" validate constraint "audit_log_op_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION sys.audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_actor uuid;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;
  end;

  insert into sys.audit_log(tbl, op, row_before, row_after, actor)
  values (
    TG_TABLE_SCHEMA||'.'||TG_TABLE_NAME,
    substring(TG_OP,1,1),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) end,
    v_actor
  );

  return case when TG_OP='DELETE' then old else new end;
end $function$
;

CREATE OR REPLACE FUNCTION sys.gc_webhook_logs(days integer DEFAULT 30)
 RETURNS void
 LANGUAGE sql
AS $function$
  delete from sys.webhook_logs
  where ts < now() - make_interval(days => days);
$function$
;

CREATE OR REPLACE FUNCTION sys.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$
;


  create policy "webhook_logs_admin_only"
  on "sys"."webhook_logs"
  as permissive
  for select
  to authenticated
using ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text));


CREATE TRIGGER _settings_touch BEFORE UPDATE ON sys.settings FOR EACH ROW EXECUTE FUNCTION sys.touch_updated_at();



