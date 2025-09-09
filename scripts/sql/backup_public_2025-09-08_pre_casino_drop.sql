--
-- PostgreSQL database dump
--

\restrict z0ZZiQneHhNwI8vs1woqXelHCdM1YxFqHBU4tKE7HKshabg015L6DiSYpdxIk6X

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: cleanup_clicks_before(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.cleanup_clicks_before(cutoff_ts timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  delete from public.clicks where ts < cutoff_ts;
end;
$$;


ALTER FUNCTION public.cleanup_clicks_before(cutoff_ts timestamp with time zone) OWNER TO app;

--
-- Name: cleanup_impressions_before(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.cleanup_impressions_before(cutoff_ts timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  delete from public.impressions where ts < cutoff_ts;
end;
$$;


ALTER FUNCTION public.cleanup_impressions_before(cutoff_ts timestamp with time zone) OWNER TO app;

--
-- Name: expire_partner_pins(); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.expire_partner_pins() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.partner_offers po
  set pinned = false
  from public.partners p
  where p.id = po.partner_id
    and po.pinned = true
    and p.expires_at is not null
    and p.expires_at <= now();
$$;


ALTER FUNCTION public.expire_partner_pins() OWNER TO app;

--
-- Name: metrics_clicks_daily(integer); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.metrics_clicks_daily(p_days integer DEFAULT 14) RETURNS TABLE(date text, count bigint)
    LANGUAGE sql STABLE
    AS $$
  with params as (
    select
      greatest(1, least(60, coalesce(p_days, 14)))::int as days,
      (timezone('utc', now())) as now_utc,
      (timezone('utc', now()))::date as today_utc
  ), since as (
    select (now_utc - (days || ' days')::interval) as since_utc, days, today_utc from params
  ), counts as (
    select (timezone('utc', coalesce(c.ts, now())))::date as d, count(*)::bigint as c
    from public.clicks c, since s
    where c.ts >= s.since_utc
    group by 1
  ), series as (
    select generate_series(s.today_utc - (s.days - 1), s.today_utc, '1 day')::date as d from since s
  )
  select to_char(s.d, 'YYYY-MM-DD') as date, coalesce(c.c, 0) as count
  from series s
  left join counts c using (d)
  order by s.d asc;
$$;


ALTER FUNCTION public.metrics_clicks_daily(p_days integer) OWNER TO app;

--
-- Name: metrics_clicks_top_offers(integer); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.metrics_clicks_top_offers(p_days integer DEFAULT 14) RETURNS TABLE(slug text, count bigint)
    LANGUAGE sql STABLE
    AS $$
  with params as (
    select greatest(1, least(60, coalesce(p_days, 14)))::int as days,
           (timezone('utc', now())) as now_utc
  )
  select o.slug as slug, count(*)::bigint as count
  from public.clicks c
  join public.offers o on o.id = c.offer_id
  , params p
  where c.ts >= (p.now_utc - (p.days || ' days')::interval)
  group by o.slug
  order by count desc, slug asc
  limit 10;
$$;


ALTER FUNCTION public.metrics_clicks_top_offers(p_days integer) OWNER TO app;

--
-- Name: pinned_offer_meta(); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.pinned_offer_meta() RETURNS TABLE(offer_slug text, plan text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform set_config('row_security', 'on', true);
  return query
    select o.slug, p.plan
    from public.partner_offers po
    join public.partners p on p.id = po.partner_id
    join public.offers   o on o.id = po.offer_id
    where po.pinned = true
      and (p.expires_at is null or p.expires_at > now())
      and o.enabled = true;
end;
$$;


ALTER FUNCTION public.pinned_offer_meta() OWNER TO app;

--
-- Name: pinned_offer_slugs(); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.pinned_offer_slugs() RETURNS SETOF text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform set_config('row_security', 'on', true);
  return query
    select o.slug
    from public.partner_offers po
    join public.partners p on p.id = po.partner_id
    join public.offers   o on o.id = po.offer_id
    where po.pinned = true
      and (p.expires_at is null or p.expires_at > now())
      and o.enabled = true;
end;
$$;


ALTER FUNCTION public.pinned_offer_slugs() OWNER TO app;

--
-- Name: purge_webhook_logs(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.purge_webhook_logs(cutoff_ts timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  delete from public.webhook_logs where created_at < cutoff_ts;
end;
$$;


ALTER FUNCTION public.purge_webhook_logs(cutoff_ts timestamp with time zone) OWNER TO app;

--
-- Name: set_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.set_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_settings_updated_at() OWNER TO app;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: app
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ begin new.updated_at=now(); return new; end $$;


ALTER FUNCTION public.set_updated_at() OWNER TO app;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.admin_users (
    email text NOT NULL
);


ALTER TABLE public.admin_users OWNER TO app;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admins OWNER TO app;

--
-- Name: attributes_registry; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.attributes_registry (
    key text NOT NULL,
    label_key text NOT NULL,
    type text NOT NULL,
    comparable boolean DEFAULT false NOT NULL,
    facetable boolean DEFAULT false NOT NULL,
    unit text,
    sort_default integer,
    CONSTRAINT attributes_registry_type_check CHECK ((type = ANY (ARRAY['text'::text, 'number'::text, 'bool'::text, 'enum'::text, 'multi_enum'::text])))
);


ALTER TABLE public.attributes_registry OWNER TO app;

--
-- Name: clicks; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.clicks (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    click_id text,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    referrer text,
    user_agent text,
    ip_hash text,
    created_at timestamp with time zone DEFAULT now(),
    offer_id bigint NOT NULL
);


ALTER TABLE public.clicks OWNER TO app;

--
-- Name: clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: app
--

ALTER TABLE public.clicks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.clicks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: compares; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.compares (
    user_id uuid NOT NULL,
    offer_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.compares OWNER TO app;

--
-- Name: favorites; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    offer_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.favorites FORCE ROW LEVEL SECURITY;


ALTER TABLE public.favorites OWNER TO app;

--
-- Name: impressions; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.impressions (
    ts timestamp with time zone DEFAULT now() NOT NULL,
    ip_hash text,
    user_agent text,
    lang text,
    offer_id bigint NOT NULL,
    referrer text,
    id bigint NOT NULL
);

ALTER TABLE ONLY public.impressions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.impressions OWNER TO app;

--
-- Name: impressions_id_seq; Type: SEQUENCE; Schema: public; Owner: app
--

ALTER TABLE public.impressions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.impressions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: app
--

CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO app;

--
-- Name: offers; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.offers (
    slug text NOT NULL,
    name text NOT NULL,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    license text DEFAULT 'Other'::text NOT NULL,
    payout text DEFAULT ''::text NOT NULL,
    payout_hours text,
    methods text[] DEFAULT '{}'::text[] NOT NULL,
    link text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    id bigint DEFAULT nextval('public.offers_id_seq'::regclass) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT offers_license_check CHECK (((license IS NULL) OR (license = ANY (ARRAY['MGA'::text, 'UKGC'::text, 'Curacao'::text, 'Other'::text])))),
    CONSTRAINT offers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


ALTER TABLE public.offers OWNER TO app;

--
-- Name: partner_offers; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.partner_offers (
    partner_id uuid NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    offer_id bigint NOT NULL
);


ALTER TABLE public.partner_offers OWNER TO app;

--
-- Name: partners; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    plan text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partners_email_chk CHECK (((email IS NULL) OR (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text))),
    CONSTRAINT partners_plan_chk CHECK ((plan = ANY (ARRAY['BASIC'::text, 'FEATURED'::text, 'TOP'::text])))
);


ALTER TABLE public.partners OWNER TO app;

--
-- Name: private_settings; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.private_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.private_settings OWNER TO app;

--
-- Name: product_attributes; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.product_attributes (
    product_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL
);


ALTER TABLE public.product_attributes OWNER TO app;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.profiles OWNER TO app;

--
-- Name: public_settings; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.public_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.public_settings OWNER TO app;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO app;

--
-- Name: table_name; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.table_name (
    id bigint NOT NULL,
    inserted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    data jsonb,
    name text
);


ALTER TABLE public.table_name OWNER TO app;

--
-- Name: table_name_id_seq; Type: SEQUENCE; Schema: public; Owner: app
--

ALTER TABLE public.table_name ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.table_name_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: v_pinned_offer_slugs; Type: VIEW; Schema: public; Owner: app
--

CREATE VIEW public.v_pinned_offer_slugs AS
 SELECT DISTINCT o.slug AS offer_slug
   FROM ((public.partner_offers po
     JOIN public.partners p ON ((p.id = po.partner_id)))
     JOIN public.offers o ON ((o.id = po.offer_id)))
  WHERE ((po.pinned = true) AND ((p.expires_at IS NULL) OR (p.expires_at > now())));


ALTER VIEW public.v_pinned_offer_slugs OWNER TO app;

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text GENERATED ALWAYS AS (type) STORED
);


ALTER TABLE public.webhook_logs OWNER TO app;

--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.admin_users (email) FROM stdin;
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.admins (user_id, created_at) FROM stdin;
\.


--
-- Data for Name: attributes_registry; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.attributes_registry (key, label_key, type, comparable, facetable, unit, sort_default) FROM stdin;
\.


--
-- Data for Name: clicks; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.clicks (id, ts, click_id, params, referrer, user_agent, ip_hash, created_at, offer_id) FROM stdin;
12	2025-09-05 13:27:49.409007+00	\N	{}	\N	\N	finaldeadbeef	2025-09-05 13:27:49.409007+00	22
13	2025-09-05 14:18:04.470717+00	\N	{}	\N	\N	deadbeef	2025-09-05 14:18:04.470717+00	22
14	2025-09-05 15:27:28.569827+00	\N	{}	\N	\N	finaldeadbeef	2025-09-05 15:27:28.569827+00	22
26	2025-09-05 15:42:55.571672+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:42:55.571672+00	22
27	2025-09-05 15:49:07.918882+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:49:07.918882+00	22
28	2025-09-05 15:51:07.240395+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:51:07.240395+00	22
29	2025-09-05 15:51:11.227916+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:51:11.227916+00	22
30	2025-09-05 15:51:13.967674+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:51:13.967674+00	22
31	2025-09-05 15:51:57.063234+00	\N	{}	\N	\N	deadbeef	2025-09-05 15:51:57.063234+00	22
\.


--
-- Data for Name: compares; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.compares (user_id, offer_id, created_at) FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.favorites (user_id, offer_id, created_at) FROM stdin;
\.


--
-- Data for Name: impressions; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.impressions (ts, ip_hash, user_agent, lang, offer_id, referrer, id) FROM stdin;
\.


--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.offers (slug, name, rating, license, payout, payout_hours, methods, link, enabled, "position", id, created_at, updated_at) FROM stdin;
unknown	Unknown Offer	0.0	Other		\N	{}	https://example.com	t	0	1	2025-09-04 15:47:04.407682+00	2025-09-04 15:47:04.407682+00
test	Test Offer	0.0	Other		\N	{}	https://example.com	t	0	3	2025-09-04 16:09:34.361531+00	2025-09-04 16:09:34.361531+00
lucky-star	Lucky Star	0.0	Other		\N	{}	https://example.com	t	0	22	2025-09-05 13:21:29.832169+00	2025-09-05 13:21:29.832169+00
\.


--
-- Data for Name: partner_offers; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.partner_offers (partner_id, pinned, created_at, updated_at, offer_id) FROM stdin;
6ee9c717-5363-4b97-95ba-46f22e001da4	t	2025-09-04 16:18:02.839838+00	2025-09-04 16:18:02.839838+00	3
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.partners (id, name, email, plan, expires_at, created_at, updated_at) FROM stdin;
6ee9c717-5363-4b97-95ba-46f22e001da4	Demo Partner	demo@example.com	FEATURED	2025-10-04 16:20:16.1235+00	2025-09-04 16:13:04.205724+00	2025-09-04 16:13:04.205724+00
\.


--
-- Data for Name: private_settings; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.private_settings (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: product_attributes; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.product_attributes (product_id, key, value) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.profiles (id, created_at) FROM stdin;
00000000-0000-0000-0000-000000000001	2025-09-05 14:09:00.379053+00
\.


--
-- Data for Name: public_settings; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.public_settings (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.settings (key, value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: table_name; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.table_name (id, inserted_at, updated_at, data, name) FROM stdin;
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public.webhook_logs (id, type, payload, created_at) FROM stdin;
\.


--
-- Name: clicks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: app
--

SELECT pg_catalog.setval('public.clicks_id_seq', 31, true);


--
-- Name: impressions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: app
--

SELECT pg_catalog.setval('public.impressions_id_seq', 1, false);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: app
--

SELECT pg_catalog.setval('public.offers_id_seq', 131, true);


--
-- Name: table_name_id_seq; Type: SEQUENCE SET; Schema: public; Owner: app
--

SELECT pg_catalog.setval('public.table_name_id_seq', 1, false);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (user_id);


--
-- Name: attributes_registry attributes_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.attributes_registry
    ADD CONSTRAINT attributes_registry_pkey PRIMARY KEY (key);


--
-- Name: clicks clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_pkey PRIMARY KEY (id);


--
-- Name: compares compares_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.compares
    ADD CONSTRAINT compares_pkey PRIMARY KEY (user_id, offer_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, offer_id);


--
-- Name: impressions impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: offers offers_slug_key; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_slug_key UNIQUE (slug);


--
-- Name: partner_offers partner_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.partner_offers
    ADD CONSTRAINT partner_offers_pkey PRIMARY KEY (partner_id, offer_id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: private_settings private_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.private_settings
    ADD CONSTRAINT private_settings_pkey PRIMARY KEY (key);


--
-- Name: product_attributes product_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (product_id, key);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: public_settings public_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.public_settings
    ADD CONSTRAINT public_settings_pkey PRIMARY KEY (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: table_name table_name_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.table_name
    ADD CONSTRAINT table_name_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: clicks_click_id_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX clicks_click_id_idx ON public.clicks USING btree (click_id);


--
-- Name: clicks_ts_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX clicks_ts_idx ON public.clicks USING btree (ts DESC);


--
-- Name: idx_admin_users_email_lower; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_admin_users_email_lower ON public.admin_users USING btree (lower(email));


--
-- Name: idx_clicks_ip_ts; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_clicks_ip_ts ON public.clicks USING btree (ip_hash, ts DESC);


--
-- Name: idx_clicks_offer_ts; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_clicks_offer_ts ON public.clicks USING btree (offer_id, ts DESC);


--
-- Name: idx_compares_user_created_at; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_compares_user_created_at ON public.compares USING btree (user_id, created_at DESC);


--
-- Name: idx_favorites_user_created_at; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_favorites_user_created_at ON public.favorites USING btree (user_id, created_at DESC);


--
-- Name: idx_impressions_offer_ts; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_impressions_offer_ts ON public.impressions USING btree (offer_id, ts DESC);


--
-- Name: idx_offers_enabled; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_offers_enabled ON public.offers USING btree (enabled);


--
-- Name: idx_offers_enabled_position; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_offers_enabled_position ON public.offers USING btree ("position") WHERE (enabled = true);


--
-- Name: idx_offers_methods_gin; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_offers_methods_gin ON public.offers USING gin (methods);


--
-- Name: idx_offers_position; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_offers_position ON public.offers USING btree ("position");


--
-- Name: idx_product_attributes_key; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX idx_product_attributes_key ON public.product_attributes USING btree (key);


--
-- Name: impressions_ts_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX impressions_ts_idx ON public.impressions USING btree (ts DESC);


--
-- Name: partner_offers_pinned_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partner_offers_pinned_idx ON public.partner_offers USING btree (pinned) WHERE (pinned = true);


--
-- Name: partner_offers_pinned_offer_id_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partner_offers_pinned_offer_id_idx ON public.partner_offers USING btree (offer_id) WHERE (pinned = true);


--
-- Name: partner_offers_pinned_partner_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partner_offers_pinned_partner_idx ON public.partner_offers USING btree (partner_id) WHERE (pinned = true);


--
-- Name: partners_email_plan_uidx; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX partners_email_plan_uidx ON public.partners USING btree (email, plan);


--
-- Name: partners_expires_at_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partners_expires_at_idx ON public.partners USING btree (expires_at);


--
-- Name: partners_expires_at_null_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partners_expires_at_null_idx ON public.partners USING btree (expires_at) WHERE (expires_at IS NULL);


--
-- Name: partners_expires_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX partners_expires_idx ON public.partners USING btree (expires_at);


--
-- Name: partners_name_uidx; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX partners_name_uidx ON public.partners USING btree (lower(name));


--
-- Name: private_settings_updated_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX private_settings_updated_idx ON public.private_settings USING btree (updated_at DESC);


--
-- Name: public_settings_updated_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX public_settings_updated_idx ON public.public_settings USING btree (updated_at DESC);


--
-- Name: webhook_logs_created_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX webhook_logs_created_idx ON public.webhook_logs USING btree (created_at DESC);


--
-- Name: webhook_logs_type_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX webhook_logs_type_idx ON public.webhook_logs USING btree (type);


--
-- Name: offers trg_offers_updated_at; Type: TRIGGER; Schema: public; Owner: app
--

CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: settings trg_settings_updated_at; Type: TRIGGER; Schema: public; Owner: app
--

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_settings_updated_at();


--
-- Name: clicks clicks_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: compares compares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.compares
    ADD CONSTRAINT compares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: impressions impressions_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: partner_offers partner_offers_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.partner_offers
    ADD CONSTRAINT partner_offers_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: partner_offers partner_offers_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.partner_offers
    ADD CONSTRAINT partner_offers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: product_attributes product_attributes_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_key_fkey FOREIGN KEY (key) REFERENCES public.attributes_registry(key) ON DELETE CASCADE;


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_offers auth manage partner_offers; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "auth manage partner_offers" ON public.partner_offers TO authenticated USING (true) WITH CHECK (true);


--
-- Name: partners auth manage partners; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "auth manage partners" ON public.partners TO authenticated USING (true) WITH CHECK (true);


--
-- Name: webhook_logs auth read webhooks; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "auth read webhooks" ON public.webhook_logs FOR SELECT TO authenticated USING (true);


--
-- Name: settings auth write settings; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "auth write settings" ON public.settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: clicks; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: clicks clicks_insert_service; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY clicks_insert_service ON public.clicks FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: clicks clicks_select_authenticated; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY clicks_select_authenticated ON public.clicks FOR SELECT TO authenticated USING (true);


--
-- Name: compares; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.compares ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites favorites read own; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "favorites read own" ON public.favorites FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: favorites favorites select own; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "favorites select own" ON public.favorites FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: favorites favorites write own; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "favorites write own" ON public.favorites TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: impressions; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.impressions ENABLE ROW LEVEL SECURITY;

--
-- Name: impressions impressions_insert_service; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY impressions_insert_service ON public.impressions FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: impressions impressions_select_authenticated; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY impressions_select_authenticated ON public.impressions FOR SELECT TO authenticated USING (true);


--
-- Name: offers; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

--
-- Name: offers offers_read_public; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY offers_read_public ON public.offers FOR SELECT USING (true);


--
-- Name: offers offers_write_service; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY offers_write_service ON public.offers TO service_role USING (true) WITH CHECK (true);


--
-- Name: partner_offers; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_offers partner_offers_read_public; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY partner_offers_read_public ON public.partner_offers FOR SELECT USING (true);


--
-- Name: partner_offers partner_offers_write_service; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY partner_offers_write_service ON public.partner_offers TO service_role USING (true) WITH CHECK (true);


--
-- Name: partners; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

--
-- Name: partners partners_read_public; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY partners_read_public ON public.partners FOR SELECT USING (true);


--
-- Name: private_settings; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles insert self; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: profiles profiles select own; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "profiles select own" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: profiles profiles update own; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: settings public read settings; Type: POLICY; Schema: public; Owner: app
--

CREATE POLICY "public read settings" ON public.settings FOR SELECT TO anon USING (true);


--
-- Name: public_settings; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.public_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: public; Owner: app
--

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION expire_partner_pins(); Type: ACL; Schema: public; Owner: app
--

GRANT ALL ON FUNCTION public.expire_partner_pins() TO anon;
GRANT ALL ON FUNCTION public.expire_partner_pins() TO authenticated;


--
-- Name: FUNCTION pinned_offer_meta(); Type: ACL; Schema: public; Owner: app
--

REVOKE ALL ON FUNCTION public.pinned_offer_meta() FROM PUBLIC;
GRANT ALL ON FUNCTION public.pinned_offer_meta() TO anon;
GRANT ALL ON FUNCTION public.pinned_offer_meta() TO authenticated;


--
-- Name: FUNCTION pinned_offer_slugs(); Type: ACL; Schema: public; Owner: app
--

REVOKE ALL ON FUNCTION public.pinned_offer_slugs() FROM PUBLIC;
GRANT ALL ON FUNCTION public.pinned_offer_slugs() TO anon;
GRANT ALL ON FUNCTION public.pinned_offer_slugs() TO authenticated;


--
-- Name: TABLE clicks; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT ON TABLE public.clicks TO authenticated;
GRANT SELECT,INSERT ON TABLE public.clicks TO service_role;


--
-- Name: TABLE favorites; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.favorites TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.favorites TO service_role;


--
-- Name: TABLE impressions; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT ON TABLE public.impressions TO authenticated;
GRANT SELECT,INSERT ON TABLE public.impressions TO service_role;


--
-- Name: TABLE offers; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT ON TABLE public.offers TO anon;
GRANT SELECT ON TABLE public.offers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.offers TO service_role;


--
-- Name: TABLE partner_offers; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT ON TABLE public.partner_offers TO anon;
GRANT SELECT ON TABLE public.partner_offers TO authenticated;
GRANT SELECT ON TABLE public.partner_offers TO service_role;


--
-- Name: TABLE partners; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT ON TABLE public.partners TO anon;
GRANT SELECT ON TABLE public.partners TO authenticated;
GRANT SELECT ON TABLE public.partners TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: app
--

GRANT SELECT,INSERT ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT ON TABLE public.profiles TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict z0ZZiQneHhNwI8vs1woqXelHCdM1YxFqHBU4tKE7HKshabg015L6DiSYpdxIk6X

