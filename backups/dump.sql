--
-- PostgreSQL database dump
--

\restrict 0TFRbw86Jr1dHPUk0pGJ8005cWZ0exIvwOGPQhu0WR7n7JQ0OvvdIGhmlSO6ix2

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

-- Started on 2025-09-14 22:14:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 142 (class 2615 OID 45527)
-- Name: aff; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA aff;


ALTER SCHEMA aff OWNER TO postgres;

--
-- TOC entry 36 (class 2615 OID 16494)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- TOC entry 23 (class 2615 OID 16388)
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- TOC entry 34 (class 2615 OID 16624)
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- TOC entry 33 (class 2615 OID 16613)
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- TOC entry 15 (class 2615 OID 16386)
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- TOC entry 12 (class 2615 OID 16605)
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- TOC entry 131 (class 2615 OID 45526)
-- Name: shop; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA shop;


ALTER SCHEMA shop OWNER TO postgres;

--
-- TOC entry 37 (class 2615 OID 16542)
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- TOC entry 129 (class 2615 OID 34534)
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- TOC entry 139 (class 2615 OID 46940)
-- Name: sys; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sys;


ALTER SCHEMA sys OWNER TO postgres;

--
-- TOC entry 31 (class 2615 OID 16653)
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- TOC entry 6 (class 3079 OID 50372)
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;


--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 6
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- TOC entry 2 (class 3079 OID 50186)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- TOC entry 8 (class 3079 OID 16689)
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 8
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- TOC entry 3 (class 3079 OID 16389)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 5 (class 3079 OID 50291)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 5
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 7 (class 3079 OID 16443)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 7
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 9 (class 3079 OID 16654)
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 9
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- TOC entry 4 (class 3079 OID 16432)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1647 (class 1247 OID 45890)
-- Name: event_type; Type: TYPE; Schema: aff; Owner: postgres
--

CREATE TYPE aff.event_type AS ENUM (
    'impression',
    'click',
    'purchase'
);


ALTER TYPE aff.event_type OWNER TO postgres;

--
-- TOC entry 1515 (class 1247 OID 46942)
-- Name: placement_tier; Type: TYPE; Schema: aff; Owner: postgres
--

CREATE TYPE aff.placement_tier AS ENUM (
    'gold',
    'silver',
    'bronze'
);


ALTER TYPE aff.placement_tier OWNER TO postgres;

--
-- TOC entry 1442 (class 1247 OID 16782)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- TOC entry 1466 (class 1247 OID 16923)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- TOC entry 1439 (class 1247 OID 16776)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1436 (class 1247 OID 16771)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1509 (class 1247 OID 33353)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1472 (class 1247 OID 16965)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1546 (class 1247 OID 50812)
-- Name: currency_code; Type: DOMAIN; Schema: public; Owner: postgres
--

CREATE DOMAIN public.currency_code AS character(3)
	CONSTRAINT currency_code_check CHECK ((VALUE ~ '^[A-Z]{3}$'::text));


ALTER DOMAIN public.currency_code OWNER TO postgres;

--
-- TOC entry 1542 (class 1247 OID 50809)
-- Name: email_citext; Type: DOMAIN; Schema: public; Owner: postgres
--

CREATE DOMAIN public.email_citext AS extensions.citext
	CONSTRAINT email_citext_check CHECK ((POSITION(('@'::text) IN (VALUE)) > 1));


ALTER DOMAIN public.email_citext OWNER TO postgres;

--
-- TOC entry 1693 (class 1247 OID 63964)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 1690 (class 1247 OID 63404)
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'succeeded',
    'failed'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- TOC entry 1559 (class 1247 OID 17136)
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- TOC entry 1487 (class 1247 OID 17093)
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- TOC entry 1490 (class 1247 OID 17107)
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- TOC entry 1565 (class 1247 OID 17178)
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- TOC entry 1562 (class 1247 OID 17149)
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- TOC entry 1499 (class 1247 OID 45669)
-- Name: promo_type; Type: TYPE; Schema: shop; Owner: postgres
--

CREATE TYPE shop.promo_type AS ENUM (
    'percent',
    'fixed'
);


ALTER TYPE shop.promo_type OWNER TO postgres;

--
-- TOC entry 1614 (class 1247 OID 21236)
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- TOC entry 735 (class 1255 OID 45986)
-- Name: track_event(aff.event_type, bigint, text, text, text); Type: FUNCTION; Schema: aff; Owner: postgres
--

CREATE FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  insert into aff.events(event_type, offer_id, session_id, ip_hash, user_agent)
  values (p_type, p_offer_id, p_session, p_ip_hash, p_ua);
$$;


ALTER FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) OWNER TO postgres;

--
-- TOC entry 582 (class 1255 OID 16540)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 626 (class 1255 OID 16753)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- TOC entry 485 (class 1255 OID 16539)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 485
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 530 (class 1255 OID 16538)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 530
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- TOC entry 656 (class 1255 OID 16597)
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 656
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- TOC entry 621 (class 1255 OID 16618)
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 621
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- TOC entry 562 (class 1255 OID 16599)
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- TOC entry 469 (class 1255 OID 16609)
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- TOC entry 681 (class 1255 OID 16610)
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- TOC entry 501 (class 1255 OID 16620)
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- TOC entry 5378 (class 0 OID 0)
-- Dependencies: 501
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- TOC entry 585 (class 1255 OID 16387)
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 448 (class 1259 OID 56370)
-- Name: product_reviews_raw; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_reviews_raw (
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT product_reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.product_reviews_raw OWNER TO postgres;

--
-- TOC entry 471 (class 1255 OID 56396)
-- Name: add_product_review(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text) RETURNS public.product_reviews_raw
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


ALTER FUNCTION public.add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text) OWNER TO postgres;

--
-- TOC entry 449 (class 1259 OID 57156)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    product_id bigint NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check1 CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 523 (class 1255 OID 57278)
-- Name: add_review(bigint, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) RETURNS public.reviews
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid;
  v_row public.reviews;
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.reviews as r (product_id, user_id, rating, title, body, status)
  values (p_product_id, v_uid, p_rating, coalesce(p_title,''), coalesce(p_body,''), 'pending')
  on conflict (product_id, user_id)
  do update set rating = excluded.rating,
                title  = excluded.title,
                body   = excluded.body,
                status = 'pending',
                updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION public.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) OWNER TO postgres;

--
-- TOC entry 529 (class 1255 OID 58908)
-- Name: admin_set_review_status(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) OWNER TO postgres;

--
-- TOC entry 746 (class 1255 OID 56585)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- TOC entry 519 (class 1255 OID 66486)
-- Name: meta_columns(text[], text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.meta_columns(schemas text[] DEFAULT '{public}'::text[], tbl text DEFAULT NULL::text) RETURNS TABLE(schema text, table_name text, column_name text, data_type text, is_nullable text, column_default text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = any (coalesce(schemas, array['public']))
    and (tbl is null or c.table_name = tbl)
  order by 1,2,c.ordinal_position;
$$;


ALTER FUNCTION public.meta_columns(schemas text[], tbl text) OWNER TO postgres;

--
-- TOC entry 744 (class 1255 OID 66487)
-- Name: meta_policies(text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.meta_policies(schemas text[] DEFAULT '{public}'::text[]) RETURNS TABLE(schema text, table_name text, policy text, cmd text, roles text[])
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  select p.schemaname, p.tablename, p.policyname, p.cmd, p.roles
  from pg_policies p
  where p.schemaname = any (coalesce(schemas, array['public']))
  order by 1,2,3;
$$;


ALTER FUNCTION public.meta_policies(schemas text[]) OWNER TO postgres;

--
-- TOC entry 666 (class 1255 OID 66484)
-- Name: meta_tables(text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.meta_tables(schemas text[] DEFAULT '{public}'::text[]) RETURNS TABLE(schema text, name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;


ALTER FUNCTION public.meta_tables(schemas text[]) OWNER TO postgres;

--
-- TOC entry 763 (class 1255 OID 66485)
-- Name: meta_views(text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.meta_views(schemas text[] DEFAULT '{public}'::text[]) RETURNS TABLE(schema text, name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  select table_schema, table_name
  from information_schema.views
  where table_schema = any (coalesce(schemas, array['public']))
  order by 1,2;
$$;


ALTER FUNCTION public.meta_views(schemas text[]) OWNER TO postgres;

--
-- TOC entry 464 (class 1255 OID 63366)
-- Name: place_order(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.place_order(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
declare
  v_id uuid;
begin
  insert into public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  values (p_user_id, 'pending', 0, 0, 0, 0, 'EUR')
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION public.place_order(p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 706 (class 1255 OID 67492)
-- Name: place_order_with_items(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text DEFAULT 'EUR'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2);
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  insert into public.orders (user_id, status, subtotal, discount_total, shipping_total, grand_total, currency)
  values (p_user_id, 'pending', 0, 0, 0, 0, coalesce(p_currency, 'EUR'))
  returning id into v_order_id;

  -- Insert items joined with products for price/title (do not insert into generated column "total")
  insert into public.order_items (order_id, product_id, title, qty, unit_price)
  select
    v_order_id,
    p.id,
    coalesce(p.title, '') as title,
    greatest(1, i.qty)::int as qty,
    p.price::numeric(10,2) as unit_price
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as i(id uuid, qty int)
  join public.ecom_products p on p.id = i.id;

  select coalesce(sum(oi.total), 0)::numeric(10,2) into v_subtotal
  from public.order_items oi where oi.order_id = v_order_id;

  update public.orders
  set subtotal = v_subtotal,
      grand_total = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;


ALTER FUNCTION public.place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text) OWNER TO postgres;

--
-- TOC entry 496 (class 1255 OID 67388)
-- Name: recalc_order_totals(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recalc_order_totals(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_shipping numeric(12,2);
BEGIN
  -- берём сумму по позициям: используем total если есть, иначе qty*unit_price
  SELECT COALESCE(SUM(COALESCE(oi.total, oi.qty * oi.unit_price)), 0)::numeric(12,2)
    INTO v_subtotal
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  SELECT discount_total, shipping_total
    INTO v_discount, v_shipping
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  v_discount := COALESCE(v_discount, 0);
  v_shipping := COALESCE(v_shipping, 0);

  UPDATE public.orders
     SET subtotal    = v_subtotal,
         grand_total = GREATEST(0, v_subtotal - v_discount + v_shipping)
   WHERE id = p_order_id;
END$$;


ALTER FUNCTION public.recalc_order_totals(p_order_id uuid) OWNER TO postgres;

--
-- TOC entry 675 (class 1255 OID 58864)
-- Name: recalc_product_rating(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recalc_product_rating(p_product_uid uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.product_rating_stats as s (product_uid, avg_rating, ratings_count, updated_at)
  select r.product_uid,
         coalesce(round(avg(r.rating)::numeric, 2), 0),
         count(*),
         now()
  from public.reviews_unified r
  where r.product_uid = p_product_uid
    and r.status = 'approved'
  group by r.product_uid
  on conflict (product_uid) do update
    set avg_rating = excluded.avg_rating,
        ratings_count = excluded.ratings_count,
        updated_at = excluded.updated_at;
end$$;


ALTER FUNCTION public.recalc_product_rating(p_product_uid uuid) OWNER TO postgres;

--
-- TOC entry 608 (class 1255 OID 58934)
-- Name: secure_submit_review_unified(text, text, text, smallint, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
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


ALTER FUNCTION public.secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 588 (class 1255 OID 57430)
-- Name: set_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_settings_updated_at() OWNER TO postgres;

--
-- TOC entry 772 (class 1255 OID 56369)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- TOC entry 648 (class 1255 OID 63790)
-- Name: tr_payments_status_propagate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_payments_status_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.tr_payments_status_propagate() OWNER TO postgres;

--
-- TOC entry 518 (class 1255 OID 67389)
-- Name: tr_recalc_after_order_items(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_recalc_after_order_items() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalc_order_totals(NEW.order_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_order_totals(OLD.order_id);
  END IF;
  RETURN NULL;
END$$;


ALTER FUNCTION public.tr_recalc_after_order_items() OWNER TO postgres;

--
-- TOC entry 478 (class 1255 OID 58865)
-- Name: tr_recalc_after_review_unified(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_recalc_after_review_unified() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
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


ALTER FUNCTION public.tr_recalc_after_review_unified() OWNER TO postgres;

--
-- TOC entry 690 (class 1255 OID 17171)
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- TOC entry 759 (class 1255 OID 17252)
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- TOC entry 689 (class 1255 OID 17183)
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- TOC entry 712 (class 1255 OID 17133)
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- TOC entry 574 (class 1255 OID 17124)
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- TOC entry 713 (class 1255 OID 17179)
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- TOC entry 521 (class 1255 OID 17192)
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- TOC entry 542 (class 1255 OID 17123)
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- TOC entry 534 (class 1255 OID 17251)
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- TOC entry 515 (class 1255 OID 17121)
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- TOC entry 595 (class 1255 OID 17160)
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- TOC entry 650 (class 1255 OID 17245)
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- TOC entry 423 (class 1259 OID 45674)
-- Name: promotions; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.promotions (
    id bigint NOT NULL,
    name text NOT NULL,
    type shop.promo_type NOT NULL,
    value numeric(10,2) NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    coupon_code text,
    is_stackable boolean DEFAULT false NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT promotions_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE shop.promotions OWNER TO postgres;

--
-- TOC entry 480 (class 1255 OID 45687)
-- Name: active_promotions(timestamp with time zone); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.active_promotions(now_ts timestamp with time zone DEFAULT now()) RETURNS SETOF shop.promotions
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  select *
  from shop.promotions p
  where p.starts_at <= now_ts
    and (p.ends_at is null or p.ends_at >= now_ts)
$$;


ALTER FUNCTION shop.active_promotions(now_ts timestamp with time zone) OWNER TO postgres;

--
-- TOC entry 527 (class 1255 OID 51967)
-- Name: add_review(bigint, integer, text, text); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'shop'
    AS $$
declare v_id bigint;
begin
  insert into shop.reviews(product_id, user_id, rating, title, body, status)
  values (p_product_id, auth.uid(), p_rating, left(p_title,200), left(p_body,5000), 'pending')
  returning id into v_id;
  return v_id;
end $$;


ALTER FUNCTION shop.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) OWNER TO postgres;

--
-- TOC entry 500 (class 1255 OID 46008)
-- Name: compute_price(bigint, bigint, integer, text); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.compute_price(p_product_id bigint, p_variant_id bigint DEFAULT NULL::bigint, p_qty integer DEFAULT 1, p_coupon text DEFAULT NULL::text) RETURNS TABLE(final_price numeric, applied jsonb)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog', 'public'
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


ALTER FUNCTION shop.compute_price(p_product_id bigint, p_variant_id bigint, p_qty integer, p_coupon text) OWNER TO postgres;

--
-- TOC entry 481 (class 1255 OID 53642)
-- Name: moderate_review(bigint, text); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.moderate_review(p_review_id bigint, p_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'shop'
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


ALTER FUNCTION shop.moderate_review(p_review_id bigint, p_status text) OWNER TO postgres;

--
-- TOC entry 487 (class 1255 OID 51173)
-- Name: products_autosku(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.products_autosku() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  if new.sku is null or length(btrim(new.sku)) = 0 then
    new.sku := 'SKU-' || coalesce(new.id, nextval(pg_get_serial_sequence('shop.products','id')));
  end if;
  return new;
end $$;


ALTER FUNCTION shop.products_autosku() OWNER TO postgres;

--
-- TOC entry 624 (class 1255 OID 52108)
-- Name: rate_limit_review(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.rate_limit_review() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION shop.rate_limit_review() OWNER TO postgres;

--
-- TOC entry 577 (class 1255 OID 45817)
-- Name: refresh_product_rating(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.refresh_product_rating() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  refresh materialized view concurrently shop.product_ratings;
  return null;
end $$;


ALTER FUNCTION shop.refresh_product_rating() OWNER TO postgres;

--
-- TOC entry 741 (class 1255 OID 50841)
-- Name: refresh_product_ratings(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.refresh_product_ratings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'shop'
    AS $$
begin
  refresh materialized view shop.product_ratings;
  return null;
end $$;


ALTER FUNCTION shop.refresh_product_ratings() OWNER TO postgres;

--
-- TOC entry 709 (class 1255 OID 51815)
-- Name: reviews_sanitize_rating(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.reviews_sanitize_rating() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  if new.rating < 1 then new.rating := 1; end if;
  if new.rating > 5 then new.rating := 5; end if;
  return new;
end $$;


ALTER FUNCTION shop.reviews_sanitize_rating() OWNER TO postgres;

--
-- TOC entry 749 (class 1255 OID 50838)
-- Name: stock_touch(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.stock_touch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION shop.stock_touch() OWNER TO postgres;

--
-- TOC entry 543 (class 1255 OID 45646)
-- Name: touch_stock(); Type: FUNCTION; Schema: shop; Owner: postgres
--

CREATE FUNCTION shop.touch_stock() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION shop.touch_stock() OWNER TO postgres;

--
-- TOC entry 526 (class 1255 OID 21214)
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 618 (class 1255 OID 17036)
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- TOC entry 684 (class 1255 OID 21215)
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 620 (class 1255 OID 21218)
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- TOC entry 685 (class 1255 OID 21233)
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- TOC entry 627 (class 1255 OID 17010)
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 668 (class 1255 OID 17009)
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 482 (class 1255 OID 17008)
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 581 (class 1255 OID 21196)
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 498 (class 1255 OID 21212)
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 628 (class 1255 OID 21213)
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- TOC entry 514 (class 1255 OID 21231)
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- TOC entry 613 (class 1255 OID 17075)
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- TOC entry 659 (class 1255 OID 17038)
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- TOC entry 753 (class 1255 OID 21217)
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- TOC entry 687 (class 1255 OID 21232)
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- TOC entry 571 (class 1255 OID 17091)
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- TOC entry 513 (class 1255 OID 21216)
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- TOC entry 491 (class 1255 OID 17025)
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- TOC entry 693 (class 1255 OID 21229)
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- TOC entry 565 (class 1255 OID 21228)
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- TOC entry 686 (class 1255 OID 21223)
-- Name: search_v2(text, text, integer, integer, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text) OWNER TO supabase_storage_admin;

--
-- TOC entry 610 (class 1255 OID 17026)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- TOC entry 682 (class 1255 OID 50836)
-- Name: audit_trigger(); Type: FUNCTION; Schema: sys; Owner: postgres
--

CREATE FUNCTION sys.audit_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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
end $$;


ALTER FUNCTION sys.audit_trigger() OWNER TO postgres;

--
-- TOC entry 707 (class 1255 OID 50861)
-- Name: gc_webhook_logs(integer); Type: FUNCTION; Schema: sys; Owner: postgres
--

CREATE FUNCTION sys.gc_webhook_logs(days integer DEFAULT 30) RETURNS void
    LANGUAGE sql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  delete from sys.webhook_logs
  where ts < now() - make_interval(days => days);
$$;


ALTER FUNCTION sys.gc_webhook_logs(days integer) OWNER TO postgres;

--
-- TOC entry 747 (class 1255 OID 50823)
-- Name: touch_updated_at(); Type: FUNCTION; Schema: sys; Owner: postgres
--

CREATE FUNCTION sys.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION sys.touch_updated_at() OWNER TO postgres;

--
-- TOC entry 436 (class 1259 OID 45898)
-- Name: events; Type: TABLE; Schema: aff; Owner: postgres
--

CREATE TABLE aff.events (
    id bigint NOT NULL,
    event_type aff.event_type NOT NULL,
    offer_id bigint NOT NULL,
    session_id text,
    ip_hash text,
    user_agent text,
    event_ts timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE aff.events OWNER TO postgres;

--
-- TOC entry 435 (class 1259 OID 45897)
-- Name: events_id_seq; Type: SEQUENCE; Schema: aff; Owner: postgres
--

CREATE SEQUENCE aff.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE aff.events_id_seq OWNER TO postgres;

--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 435
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: aff; Owner: postgres
--

ALTER SEQUENCE aff.events_id_seq OWNED BY aff.events.id;


--
-- TOC entry 437 (class 1259 OID 45914)
-- Name: offer_stats_30d; Type: VIEW; Schema: aff; Owner: postgres
--

CREATE VIEW aff.offer_stats_30d AS
 WITH base AS (
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


ALTER VIEW aff.offer_stats_30d OWNER TO postgres;

--
-- TOC entry 434 (class 1259 OID 45850)
-- Name: offers; Type: TABLE; Schema: aff; Owner: postgres
--

CREATE TABLE aff.offers (
    id bigint NOT NULL,
    source_id bigint,
    slug text NOT NULL,
    title text NOT NULL,
    affiliate_url text,
    country text,
    license text,
    payout_hours integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE aff.offers OWNER TO postgres;

--
-- TOC entry 433 (class 1259 OID 45849)
-- Name: offers_id_seq; Type: SEQUENCE; Schema: aff; Owner: postgres
--

CREATE SEQUENCE aff.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE aff.offers_id_seq OWNER TO postgres;

--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 433
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: aff; Owner: postgres
--

ALTER SEQUENCE aff.offers_id_seq OWNED BY aff.offers.id;


--
-- TOC entry 452 (class 1259 OID 58814)
-- Name: product_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_catalog (
    product_uid uuid DEFAULT gen_random_uuid() NOT NULL,
    source_schema text NOT NULL,
    source_table text NOT NULL,
    source_pk text NOT NULL,
    title text,
    slug text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_catalog OWNER TO postgres;

--
-- TOC entry 454 (class 1259 OID 58842)
-- Name: product_rating_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_rating_stats (
    product_uid uuid NOT NULL,
    avg_rating numeric(3,2) DEFAULT 0 NOT NULL,
    ratings_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_rating_stats OWNER TO postgres;

--
-- TOC entry 458 (class 1259 OID 58881)
-- Name: offers_with_ratings; Type: VIEW; Schema: aff; Owner: postgres
--

CREATE VIEW aff.offers_with_ratings AS
 SELECT o.id,
    o.source_id,
    o.slug,
    o.title,
    o.affiliate_url,
    o.country,
    o.license,
    o.payout_hours,
    o.is_active,
    o.created_at,
    s.avg_rating,
    s.ratings_count
   FROM ((aff.offers o
     LEFT JOIN public.product_catalog c ON (((c.source_schema = 'aff'::text) AND (c.source_table = 'offers'::text) AND (c.source_pk = (o.id)::text))))
     LEFT JOIN public.product_rating_stats s ON ((s.product_uid = c.product_uid)));


ALTER VIEW aff.offers_with_ratings OWNER TO postgres;

--
-- TOC entry 432 (class 1259 OID 45841)
-- Name: sources; Type: TABLE; Schema: aff; Owner: postgres
--

CREATE TABLE aff.sources (
    id bigint NOT NULL,
    name text NOT NULL,
    base_url text
);


ALTER TABLE aff.sources OWNER TO postgres;

--
-- TOC entry 431 (class 1259 OID 45840)
-- Name: sources_id_seq; Type: SEQUENCE; Schema: aff; Owner: postgres
--

CREATE SEQUENCE aff.sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE aff.sources_id_seq OWNER TO postgres;

--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 431
-- Name: sources_id_seq; Type: SEQUENCE OWNED BY; Schema: aff; Owner: postgres
--

ALTER SEQUENCE aff.sources_id_seq OWNED BY aff.sources.id;


--
-- TOC entry 363 (class 1259 OID 16525)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 380 (class 1259 OID 16927)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- TOC entry 371 (class 1259 OID 16725)
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 371
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 362 (class 1259 OID 16518)
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 375 (class 1259 OID 16814)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 374 (class 1259 OID 16802)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 374
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 373 (class 1259 OID 16789)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 393 (class 1259 OID 33357)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_id text NOT NULL,
    client_secret_hash text NOT NULL,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- TOC entry 381 (class 1259 OID 16977)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 361 (class 1259 OID 16507)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 360 (class 1259 OID 16506)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 360
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 378 (class 1259 OID 16856)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 379 (class 1259 OID 16874)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 379
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 364 (class 1259 OID 16533)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 372 (class 1259 OID 16755)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 372
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 372
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 377 (class 1259 OID 16841)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 377
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 376 (class 1259 OID 16832)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 376
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 359 (class 1259 OID 16495)
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 359
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 405 (class 1259 OID 42970)
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    kind text DEFAULT 'shipping'::text NOT NULL,
    name text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    postal_code text NOT NULL,
    country text DEFAULT 'DE'::text NOT NULL,
    phone text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 43211)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor uuid,
    action text NOT NULL,
    entity text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 411 (class 1259 OID 43210)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 411
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- TOC entry 402 (class 1259 OID 42844)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    qty integer NOT NULL,
    price_at_add numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_qty_check CHECK ((qty > 0))
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 42832)
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- TOC entry 414 (class 1259 OID 45549)
-- Name: categories; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.categories (
    id bigint NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    CONSTRAINT categories_slug_check CHECK ((slug ~ '^[a-z0-9-]+$'::text))
);


ALTER TABLE shop.categories OWNER TO postgres;

--
-- TOC entry 444 (class 1259 OID 51713)
-- Name: categories; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.categories WITH (security_invoker='on') AS
 SELECT id,
    slug,
    name
   FROM shop.categories;


ALTER VIEW public.categories OWNER TO postgres;

--
-- TOC entry 409 (class 1259 OID 43122)
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupon_redemptions (
    code text NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coupon_redemptions OWNER TO postgres;

--
-- TOC entry 408 (class 1259 OID 43112)
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    code text NOT NULL,
    kind text DEFAULT 'percent'::text NOT NULL,
    value numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    max_redemptions integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- TOC entry 397 (class 1259 OID 42650)
-- Name: ecom_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ecom_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ecom_categories OWNER TO postgres;

--
-- TOC entry 398 (class 1259 OID 42661)
-- Name: ecom_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ecom_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    price numeric(10,2) NOT NULL,
    rating real DEFAULT 0 NOT NULL,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    category_slug text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    short_desc text,
    specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    CONSTRAINT ecom_products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


ALTER TABLE public.ecom_products OWNER TO postgres;

--
-- TOC entry 456 (class 1259 OID 58871)
-- Name: ecom_products_with_ratings; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.ecom_products_with_ratings WITH (security_invoker='on') AS
 SELECT p.id,
    p.slug,
    p.title,
    p.price,
    p.rating,
    p.images,
    p.category_slug,
    p.tags,
    p.short_desc,
    p.specs,
    p.created_at,
    p.status,
    s.avg_rating,
    s.ratings_count
   FROM ((public.ecom_products p
     LEFT JOIN public.product_catalog c ON (((c.source_schema = 'public'::text) AND (c.source_table = 'ecom_products'::text) AND (c.source_pk = (p.id)::text))))
     LEFT JOIN public.product_rating_stats s ON ((s.product_uid = c.product_uid)));


ALTER VIEW public.ecom_products_with_ratings OWNER TO postgres;

--
-- TOC entry 399 (class 1259 OID 42681)
-- Name: ecom_wishlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ecom_wishlist (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ecom_wishlist OWNER TO postgres;

--
-- TOC entry 461 (class 1259 OID 63605)
-- Name: line_total_is_generated; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.line_total_is_generated (
    "coalesce" boolean
);


ALTER TABLE public.line_total_is_generated OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 37020)
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 42906)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    title text NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) GENERATED ALWAYS AS (((qty)::numeric * unit_price)) STORED,
    CONSTRAINT chk_order_items_qty_pos CHECK ((qty >= 1)),
    CONSTRAINT order_items_qty_check CHECK ((qty > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 42886)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_total numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_total numeric(10,2) DEFAULT 0 NOT NULL,
    grand_total numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 407 (class 1259 OID 43046)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    provider text NOT NULL,
    provider_ref text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_payments_amount_pos CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 463 (class 1259 OID 67594)
-- Name: order_history_v; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.order_history_v WITH (security_invoker='on') AS
 SELECT id AS order_id,
    created_at,
    (COALESCE(grand_total, ( SELECT sum(oi.total) AS sum
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)), ((subtotal - discount_total) + shipping_total), (0)::numeric))::numeric(10,2) AS amount,
    currency,
    COALESCE(( SELECT (p.status)::text AS status
           FROM public.payments p
          WHERE (p.order_id = o.id)
          ORDER BY
                CASE p.status
                    WHEN 'succeeded'::public.payment_status THEN 3
                    WHEN 'pending'::public.payment_status THEN 2
                    ELSE 1
                END DESC, p.created_at DESC
         LIMIT 1), (status)::text) AS status
   FROM public.orders o;


ALTER VIEW public.order_history_v OWNER TO postgres;

--
-- TOC entry 462 (class 1259 OID 64661)
-- Name: order_items_v; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.order_items_v WITH (security_invoker='on') AS
 SELECT id,
    order_id,
    product_id,
    variant_id,
    title,
    qty,
    unit_price,
    total,
    total AS line_total
   FROM public.order_items oi;


ALTER VIEW public.order_items_v OWNER TO postgres;

--
-- TOC entry 450 (class 1259 OID 57254)
-- Name: product_reviews; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.product_reviews WITH (security_invoker='on') AS
 SELECT product_id,
    user_id,
    rating,
    title,
    body,
    status,
    created_at,
    updated_at
   FROM public.reviews;


ALTER VIEW public.product_reviews OWNER TO postgres;

--
-- TOC entry 453 (class 1259 OID 58826)
-- Name: reviews_unified; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews_unified (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_uid uuid NOT NULL,
    rating smallint NOT NULL,
    title text,
    body text,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    user_id uuid,
    CONSTRAINT reviews_unified_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_unified_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.reviews_unified OWNER TO postgres;

--
-- TOC entry 459 (class 1259 OID 58909)
-- Name: product_reviews_admin_v; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.product_reviews_admin_v WITH (security_invoker='on') AS
 SELECT r.id,
    r.product_uid,
    c.source_schema,
    c.source_table,
    c.source_pk,
    c.title AS product_title,
    c.slug AS product_slug,
    r.rating,
    r.title AS review_title,
    r.body AS review_body,
    r.status,
    r.created_at
   FROM (public.reviews_unified r
     JOIN public.product_catalog c ON ((c.product_uid = r.product_uid)));


ALTER VIEW public.product_reviews_admin_v OWNER TO postgres;

--
-- TOC entry 430 (class 1259 OID 45789)
-- Name: reviews; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.reviews (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    title text,
    body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE shop.reviews OWNER TO postgres;

--
-- TOC entry 445 (class 1259 OID 52022)
-- Name: product_ratings; Type: MATERIALIZED VIEW; Schema: shop; Owner: postgres
--

CREATE MATERIALIZED VIEW shop.product_ratings AS
 SELECT product_id,
    round(avg(rating), 2) AS rating_value,
    count(*) AS rating_count
   FROM shop.reviews
  WHERE (status = 'approved'::text)
  GROUP BY product_id
  WITH NO DATA;


ALTER MATERIALIZED VIEW shop.product_ratings OWNER TO postgres;

--
-- TOC entry 416 (class 1259 OID 45561)
-- Name: products; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.products (
    id bigint NOT NULL,
    sku text NOT NULL,
    title text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    category_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    search tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('simple'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(description, ''::text)), 'B'::"char"))) STORED,
    slug text,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE shop.products OWNER TO postgres;

--
-- TOC entry 447 (class 1259 OID 53744)
-- Name: products; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.products WITH (security_invoker='true') AS
 SELECT p.id,
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


ALTER VIEW public.products OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 42796)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- TOC entry 455 (class 1259 OID 58855)
-- Name: review_rate_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_rate_limits (
    ip_hash text NOT NULL,
    last_at timestamp with time zone DEFAULT now() NOT NULL,
    count_24h integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.review_rate_limits OWNER TO postgres;

--
-- TOC entry 410 (class 1259 OID 43166)
-- Name: reviews__backup_20250909_181553; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews__backup_20250909_181553 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    user_id uuid,
    rating integer NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews__backup_20250909_181553 OWNER TO postgres;

--
-- TOC entry 443 (class 1259 OID 51584)
-- Name: reviews__backup_20250909_181804; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.reviews__backup_20250909_181804 WITH (security_invoker='on') AS
 SELECT id,
    product_id,
    rating,
    title,
    body,
    created_at
   FROM shop.reviews r;


ALTER VIEW public.reviews__backup_20250909_181804 OWNER TO postgres;

--
-- TOC entry 451 (class 1259 OID 57421)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 406 (class 1259 OID 43008)
-- Name: shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    carrier text,
    tracking_number text,
    status text DEFAULT 'ready'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shipments OWNER TO postgres;

--
-- TOC entry 460 (class 1259 OID 63602)
-- Name: total_is_generated; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.total_is_generated (
    "coalesce" boolean
);


ALTER TABLE public.total_is_generated OWNER TO postgres;

--
-- TOC entry 390 (class 1259 OID 17255)
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- TOC entry 382 (class 1259 OID 17003)
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- TOC entry 387 (class 1259 OID 17109)
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- TOC entry 386 (class 1259 OID 17108)
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 413 (class 1259 OID 45548)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.categories_id_seq OWNER TO postgres;

--
-- TOC entry 5545 (class 0 OID 0)
-- Dependencies: 413
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.categories_id_seq OWNED BY shop.categories.id;


--
-- TOC entry 424 (class 1259 OID 45708)
-- Name: customers; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customers_email_check CHECK ((POSITION(('@'::text) IN (email)) > 1))
);


ALTER TABLE shop.customers OWNER TO postgres;

--
-- TOC entry 428 (class 1259 OID 45742)
-- Name: order_items; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    variant_id bigint,
    qty integer NOT NULL,
    price numeric(10,2) NOT NULL,
    line_total numeric(10,2) GENERATED ALWAYS AS (((qty)::numeric * price)) STORED,
    CONSTRAINT order_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT order_items_qty_check CHECK ((qty > 0))
);


ALTER TABLE shop.order_items OWNER TO postgres;

--
-- TOC entry 427 (class 1259 OID 45741)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.order_items_id_seq OWNER TO postgres;

--
-- TOC entry 5546 (class 0 OID 0)
-- Dependencies: 427
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.order_items_id_seq OWNED BY shop.order_items.id;


--
-- TOC entry 426 (class 1259 OID 45721)
-- Name: orders; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.orders (
    id bigint NOT NULL,
    customer_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    discount_total numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_discount_total_check CHECK ((discount_total >= (0)::numeric)),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE shop.orders OWNER TO postgres;

--
-- TOC entry 425 (class 1259 OID 45720)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.orders_id_seq OWNER TO postgres;

--
-- TOC entry 5547 (class 0 OID 0)
-- Dependencies: 425
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.orders_id_seq OWNED BY shop.orders.id;


--
-- TOC entry 418 (class 1259 OID 45581)
-- Name: product_images; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.product_images (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE shop.product_images OWNER TO postgres;

--
-- TOC entry 417 (class 1259 OID 45580)
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.product_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.product_images_id_seq OWNER TO postgres;

--
-- TOC entry 5548 (class 0 OID 0)
-- Dependencies: 417
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.product_images_id_seq OWNED BY shop.product_images.id;


--
-- TOC entry 446 (class 1259 OID 53072)
-- Name: product_ratings_vw; Type: VIEW; Schema: shop; Owner: postgres
--

CREATE VIEW shop.product_ratings_vw AS
 SELECT product_id,
    round(avg(rating), 2) AS rating_value,
    count(*) AS rating_count
   FROM shop.reviews
  WHERE (status = 'approved'::text)
  GROUP BY product_id;


ALTER VIEW shop.product_ratings_vw OWNER TO postgres;

--
-- TOC entry 415 (class 1259 OID 45560)
-- Name: products_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.products_id_seq OWNER TO postgres;

--
-- TOC entry 5549 (class 0 OID 0)
-- Dependencies: 415
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.products_id_seq OWNED BY shop.products.id;


--
-- TOC entry 457 (class 1259 OID 58876)
-- Name: products_with_ratings; Type: VIEW; Schema: shop; Owner: postgres
--

CREATE VIEW shop.products_with_ratings AS
 SELECT p.id,
    p.sku,
    p.title,
    p.description,
    p.price,
    p.currency,
    p.category_id,
    p.is_active,
    p.created_at,
    p.search,
    p.slug,
    s.avg_rating,
    s.ratings_count
   FROM ((shop.products p
     LEFT JOIN public.product_catalog c ON (((c.source_schema = 'shop'::text) AND (c.source_table = 'products'::text) AND (c.source_pk = (p.id)::text))))
     LEFT JOIN public.product_rating_stats s ON ((s.product_uid = c.product_uid)));


ALTER VIEW shop.products_with_ratings OWNER TO postgres;

--
-- TOC entry 422 (class 1259 OID 45673)
-- Name: promotions_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.promotions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.promotions_id_seq OWNER TO postgres;

--
-- TOC entry 5550 (class 0 OID 0)
-- Dependencies: 422
-- Name: promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.promotions_id_seq OWNED BY shop.promotions.id;


--
-- TOC entry 429 (class 1259 OID 45788)
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.reviews_id_seq OWNER TO postgres;

--
-- TOC entry 5551 (class 0 OID 0)
-- Dependencies: 429
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.reviews_id_seq OWNED BY shop.reviews.id;


--
-- TOC entry 421 (class 1259 OID 45633)
-- Name: stock; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.stock (
    variant_id bigint NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_qty_check CHECK ((qty >= 0))
);


ALTER TABLE shop.stock OWNER TO postgres;

--
-- TOC entry 420 (class 1259 OID 45618)
-- Name: variants; Type: TABLE; Schema: shop; Owner: postgres
--

CREATE TABLE shop.variants (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    name text NOT NULL,
    price_override numeric(10,2),
    sku text
);


ALTER TABLE shop.variants OWNER TO postgres;

--
-- TOC entry 419 (class 1259 OID 45617)
-- Name: variants_id_seq; Type: SEQUENCE; Schema: shop; Owner: postgres
--

CREATE SEQUENCE shop.variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shop.variants_id_seq OWNER TO postgres;

--
-- TOC entry 5552 (class 0 OID 0)
-- Dependencies: 419
-- Name: variants_id_seq; Type: SEQUENCE OWNED BY; Schema: shop; Owner: postgres
--

ALTER SEQUENCE shop.variants_id_seq OWNED BY shop.variants.id;


--
-- TOC entry 365 (class 1259 OID 16546)
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- TOC entry 5553 (class 0 OID 0)
-- Dependencies: 365
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 392 (class 1259 OID 21242)
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- TOC entry 367 (class 1259 OID 16588)
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- TOC entry 366 (class 1259 OID 16561)
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- TOC entry 5556 (class 0 OID 0)
-- Dependencies: 366
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 391 (class 1259 OID 21197)
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- TOC entry 383 (class 1259 OID 17040)
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- TOC entry 384 (class 1259 OID 17054)
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- TOC entry 394 (class 1259 OID 34535)
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- TOC entry 395 (class 1259 OID 34542)
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


ALTER TABLE supabase_migrations.seed_files OWNER TO postgres;

--
-- TOC entry 440 (class 1259 OID 50826)
-- Name: audit_log; Type: TABLE; Schema: sys; Owner: postgres
--

CREATE TABLE sys.audit_log (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    tbl text NOT NULL,
    op text NOT NULL,
    row_before jsonb,
    row_after jsonb,
    actor uuid,
    ip text,
    CONSTRAINT audit_log_op_check CHECK ((op = ANY (ARRAY['I'::text, 'U'::text, 'D'::text])))
);


ALTER TABLE sys.audit_log OWNER TO postgres;

--
-- TOC entry 439 (class 1259 OID 50825)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: sys; Owner: postgres
--

CREATE SEQUENCE sys.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sys.audit_log_id_seq OWNER TO postgres;

--
-- TOC entry 5561 (class 0 OID 0)
-- Dependencies: 439
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: sys; Owner: postgres
--

ALTER SEQUENCE sys.audit_log_id_seq OWNED BY sys.audit_log.id;


--
-- TOC entry 438 (class 1259 OID 50814)
-- Name: settings; Type: TABLE; Schema: sys; Owner: postgres
--

CREATE TABLE sys.settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE sys.settings OWNER TO postgres;

--
-- TOC entry 442 (class 1259 OID 50851)
-- Name: webhook_logs; Type: TABLE; Schema: sys; Owner: postgres
--

CREATE TABLE sys.webhook_logs (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    status integer NOT NULL,
    payload jsonb,
    response jsonb
);


ALTER TABLE sys.webhook_logs OWNER TO postgres;

--
-- TOC entry 441 (class 1259 OID 50850)
-- Name: webhook_logs_id_seq; Type: SEQUENCE; Schema: sys; Owner: postgres
--

CREATE SEQUENCE sys.webhook_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sys.webhook_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5562 (class 0 OID 0)
-- Dependencies: 441
-- Name: webhook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: sys; Owner: postgres
--

ALTER SEQUENCE sys.webhook_logs_id_seq OWNED BY sys.webhook_logs.id;


--
-- TOC entry 4347 (class 2604 OID 45901)
-- Name: events id; Type: DEFAULT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.events ALTER COLUMN id SET DEFAULT nextval('aff.events_id_seq'::regclass);


--
-- TOC entry 4344 (class 2604 OID 45853)
-- Name: offers id; Type: DEFAULT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.offers ALTER COLUMN id SET DEFAULT nextval('aff.offers_id_seq'::regclass);


--
-- TOC entry 4343 (class 2604 OID 45844)
-- Name: sources id; Type: DEFAULT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.sources ALTER COLUMN id SET DEFAULT nextval('aff.sources_id_seq'::regclass);


--
-- TOC entry 4228 (class 2604 OID 16510)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4314 (class 2604 OID 43214)
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- TOC entry 4316 (class 2604 OID 45552)
-- Name: categories id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.categories ALTER COLUMN id SET DEFAULT nextval('shop.categories_id_seq'::regclass);


--
-- TOC entry 4338 (class 2604 OID 45745)
-- Name: order_items id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.order_items ALTER COLUMN id SET DEFAULT nextval('shop.order_items_id_seq'::regclass);


--
-- TOC entry 4333 (class 2604 OID 45724)
-- Name: orders id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.orders ALTER COLUMN id SET DEFAULT nextval('shop.orders_id_seq'::regclass);


--
-- TOC entry 4322 (class 2604 OID 45584)
-- Name: product_images id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.product_images ALTER COLUMN id SET DEFAULT nextval('shop.product_images_id_seq'::regclass);


--
-- TOC entry 4317 (class 2604 OID 45564)
-- Name: products id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.products ALTER COLUMN id SET DEFAULT nextval('shop.products_id_seq'::regclass);


--
-- TOC entry 4327 (class 2604 OID 45677)
-- Name: promotions id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.promotions ALTER COLUMN id SET DEFAULT nextval('shop.promotions_id_seq'::regclass);


--
-- TOC entry 4340 (class 2604 OID 45792)
-- Name: reviews id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.reviews ALTER COLUMN id SET DEFAULT nextval('shop.reviews_id_seq'::regclass);


--
-- TOC entry 4324 (class 2604 OID 45621)
-- Name: variants id; Type: DEFAULT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.variants ALTER COLUMN id SET DEFAULT nextval('shop.variants_id_seq'::regclass);


--
-- TOC entry 4351 (class 2604 OID 50829)
-- Name: audit_log id; Type: DEFAULT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.audit_log ALTER COLUMN id SET DEFAULT nextval('sys.audit_log_id_seq'::regclass);


--
-- TOC entry 4353 (class 2604 OID 50854)
-- Name: webhook_logs id; Type: DEFAULT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.webhook_logs ALTER COLUMN id SET DEFAULT nextval('sys.webhook_logs_id_seq'::regclass);


--
-- TOC entry 5150 (class 0 OID 45898)
-- Dependencies: 436
-- Data for Name: events; Type: TABLE DATA; Schema: aff; Owner: postgres
--

COPY aff.events (id, event_type, offer_id, session_id, ip_hash, user_agent, event_ts) FROM stdin;
\.


--
-- TOC entry 5148 (class 0 OID 45850)
-- Dependencies: 434
-- Data for Name: offers; Type: TABLE DATA; Schema: aff; Owner: postgres
--

COPY aff.offers (id, source_id, slug, title, affiliate_url, country, license, payout_hours, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 5146 (class 0 OID 45841)
-- Dependencies: 432
-- Data for Name: sources; Type: TABLE DATA; Schema: aff; Owner: postgres
--

COPY aff.sources (id, name, base_url) FROM stdin;
\.


--
-- TOC entry 5084 (class 0 OID 16525)
-- Dependencies: 363
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	1d1bfb6d-27d9-4465-bfd5-12b7eda12975	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"stasvolohovish@gmail.com","user_id":"e5ddebdd-9faa-4ce4-82a7-b2d3df7403cb","user_phone":""}}	2025-09-11 13:22:04.94882+00	
00000000-0000-0000-0000-000000000000	99722bfc-9a78-4e70-b7dc-2464b1e269c1	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"e5ddebdd-9faa-4ce4-82a7-b2d3df7403cb","user_phone":""}}	2025-09-11 13:25:03.033096+00	
00000000-0000-0000-0000-000000000000	e82c9f45-79c1-4f95-8941-dc78913e065a	{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"08e9bd66-1013-42c9-9425-447728fc497d"}}	2025-09-11 13:25:16.00092+00	
00000000-0000-0000-0000-000000000000	6c5bbe05-5969-4d5a-949a-34eaacbc6d8a	{"action":"user_signedup","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-11 13:25:35.773146+00	
00000000-0000-0000-0000-000000000000	09a2b3b4-f7f3-4fdc-92df-f54941623117	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"you@example.com","user_id":"de7d367c-7533-44cc-84f9-81b5ea85c349","user_phone":""}}	2025-09-11 13:34:46.650909+00	
00000000-0000-0000-0000-000000000000	3612c5c5-7446-47a9-9681-e571c874ad26	{"action":"user_recovery_requested","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 14:13:46.191432+00	
00000000-0000-0000-0000-000000000000	1e0e5914-5116-4e90-af9b-7b9c0f6e4728	{"action":"token_refreshed","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 14:24:46.078767+00	
00000000-0000-0000-0000-000000000000	ea81986d-717a-4e93-a694-ed156ba65995	{"action":"token_revoked","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 14:24:46.101077+00	
00000000-0000-0000-0000-000000000000	00ca5b64-3926-4bc7-9836-d8abd9312ad8	{"action":"user_recovery_requested","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 15:24:00.816862+00	
00000000-0000-0000-0000-000000000000	f2642a05-e40c-499a-88db-893d04aa601f	{"action":"login","actor_id":"08e9bd66-1013-42c9-9425-447728fc497d","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 15:24:22.269656+00	
00000000-0000-0000-0000-000000000000	b1990457-3204-49d9-a2c3-1f5562777b4c	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"you@example.com","user_id":"de7d367c-7533-44cc-84f9-81b5ea85c349","user_phone":""}}	2025-09-11 16:13:39.82661+00	
00000000-0000-0000-0000-000000000000	90de0190-2e6c-497a-b9f8-1f575006a6ef	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"08e9bd66-1013-42c9-9425-447728fc497d","user_phone":""}}	2025-09-11 16:39:15.254689+00	
00000000-0000-0000-0000-000000000000	6a87259a-491a-484d-aee2-e9a2a42baabd	{"action":"user_invited","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"c847c51f-1802-4e40-ae5c-a240ec826d85"}}	2025-09-11 16:39:26.69732+00	
00000000-0000-0000-0000-000000000000	bc8b6f5f-d65d-415e-9edc-08645cb1b8fa	{"action":"user_signedup","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-11 16:39:51.276178+00	
00000000-0000-0000-0000-000000000000	e78e9606-553b-42f1-87bd-a866051cd4f2	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 16:56:29.253167+00	
00000000-0000-0000-0000-000000000000	76d0f667-e5a4-43af-8ed9-fc8d4a4328f2	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 16:56:38.090758+00	
00000000-0000-0000-0000-000000000000	f7a9ea16-4b53-4b5b-8e1e-275b0703b26e	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 17:03:37.890344+00	
00000000-0000-0000-0000-000000000000	1a97fd42-a1b3-4577-a668-629e3b611a9a	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 17:03:50.702564+00	
00000000-0000-0000-0000-000000000000	a876a775-a1d8-4f3f-abae-3649a93d55db	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 17:34:59.156813+00	
00000000-0000-0000-0000-000000000000	2891c606-86b3-4746-8e41-50b03354b23f	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 17:35:14.229195+00	
00000000-0000-0000-0000-000000000000	b40a6f0a-7d6a-4d04-a616-bb09b406d888	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 17:46:17.292877+00	
00000000-0000-0000-0000-000000000000	18c12193-759c-440c-b053-1ad31421cef9	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 17:46:26.50923+00	
00000000-0000-0000-0000-000000000000	7030ef39-388a-4c4b-af11-f69053b29169	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 17:58:45.764821+00	
00000000-0000-0000-0000-000000000000	445c0e34-512c-4506-906a-b674b28b578e	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 17:59:03.464323+00	
00000000-0000-0000-0000-000000000000	6219c43f-6c08-413d-9673-231d4a41cb21	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 18:34:17.517448+00	
00000000-0000-0000-0000-000000000000	0a8f36cf-b3a6-4436-b29c-cd63dcb79315	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 18:34:41.846633+00	
00000000-0000-0000-0000-000000000000	95d292de-7d65-4cdb-9ec8-6479e4d91862	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 18:38:30.214589+00	
00000000-0000-0000-0000-000000000000	1630cb4d-a86b-4f60-9d2e-406722c2f5fb	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 18:38:37.840936+00	
00000000-0000-0000-0000-000000000000	498a8070-5f69-4f95-a750-d17c4542df32	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 18:40:03.322492+00	
00000000-0000-0000-0000-000000000000	64a69dd3-5948-49ec-ac7e-1f42a5500279	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 18:40:10.504098+00	
00000000-0000-0000-0000-000000000000	850ffc83-290b-4c3b-b2da-8094ac07fbac	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 19:13:21.932132+00	
00000000-0000-0000-0000-000000000000	54bb60f2-6fd0-468d-9f20-8bbc25922fea	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 19:13:31.359736+00	
00000000-0000-0000-0000-000000000000	3defc358-eff1-4017-a234-45717a0f7791	{"action":"token_refreshed","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 19:48:51.104471+00	
00000000-0000-0000-0000-000000000000	330aff33-65d5-418b-8069-f54e4137361d	{"action":"token_revoked","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 19:48:51.114114+00	
00000000-0000-0000-0000-000000000000	3567c446-2033-4a03-8141-f382349bd3e3	{"action":"token_refreshed","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 19:49:02.022295+00	
00000000-0000-0000-0000-000000000000	3040ff1b-7e9a-4ba3-894d-a22056de9bc3	{"action":"user_recovery_requested","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-11 20:07:23.902427+00	
00000000-0000-0000-0000-000000000000	ba51e37e-af8a-4ce0-a055-3f5a2853081c	{"action":"login","actor_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-11 20:07:38.991328+00	
00000000-0000-0000-0000-000000000000	f03814ef-2785-4fb8-b3b6-0ec82d30b8e6	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"c847c51f-1802-4e40-ae5c-a240ec826d85","user_phone":""}}	2025-09-11 20:22:25.071777+00	
00000000-0000-0000-0000-000000000000	b1f0ff93-454a-4eb3-9cc6-802f0ca07d5a	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"stasvolohovish@gmail.com","user_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","user_phone":""}}	2025-09-11 20:22:56.457058+00	
00000000-0000-0000-0000-000000000000	ac3446ee-03c5-4a96-8aa3-4e1eae1715d6	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-11 20:30:25.015323+00	
00000000-0000-0000-0000-000000000000	3ff7f370-a7bc-413f-922b-aa4134ffc8f4	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-11 20:31:38.857503+00	
00000000-0000-0000-0000-000000000000	81370520-21ac-4594-b2b8-6db54c4c4d21	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-11 20:32:18.543645+00	
00000000-0000-0000-0000-000000000000	1824392c-d435-4512-ae05-37a9cf0da0e8	{"action":"user_modified","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"user","traits":{"user_email":"stasvolohovish@gmail.com","user_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","user_phone":""}}	2025-09-12 09:57:20.285572+00	
00000000-0000-0000-0000-000000000000	94695596-bffd-4fea-90bb-75a3638be107	{"action":"user_recovery_requested","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-12 10:57:57.684247+00	
00000000-0000-0000-0000-000000000000	7bbc85d0-be79-4b9d-9eb7-f1e2e8134b21	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-12 10:58:15.810167+00	
00000000-0000-0000-0000-000000000000	bfd1425f-3f62-42fb-98b4-faa5e92cb43a	{"action":"user_updated_password","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-12 10:58:26.858566+00	
00000000-0000-0000-0000-000000000000	a77b52c0-ab2d-4a64-86a1-9e3b930d5988	{"action":"user_modified","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-12 10:58:26.860427+00	
00000000-0000-0000-0000-000000000000	31ad1ab6-3140-4b31-8235-5415b648b28a	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 11:09:50.925209+00	
00000000-0000-0000-0000-000000000000	4de21ee7-4906-4001-bf96-f7aa69b9ca5c	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 12:11:47.399621+00	
00000000-0000-0000-0000-000000000000	4bbbdf54-5034-4e5d-b59b-ba0f08bd0049	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 13:10:27.924466+00	
00000000-0000-0000-0000-000000000000	e7331bba-dadc-44a3-bc18-e98efc2e335a	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 13:10:27.953888+00	
00000000-0000-0000-0000-000000000000	e2f35ddc-9dd2-41ba-bb56-d2d477755082	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 14:27:09.102183+00	
00000000-0000-0000-0000-000000000000	5797704c-d44c-4931-b6b1-1d11ab3e9f4c	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 14:27:09.12408+00	
00000000-0000-0000-0000-000000000000	12bdad64-c108-4193-9b02-12cdd1446327	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 14:27:09.207666+00	
00000000-0000-0000-0000-000000000000	efed24a3-c598-43b9-87e3-2c6884203836	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 15:54:27.432409+00	
00000000-0000-0000-0000-000000000000	e621263b-aaf0-4857-a086-30e4cd653381	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 15:54:27.444527+00	
00000000-0000-0000-0000-000000000000	ccc7a7dd-6acd-40c7-842b-613c564c03bf	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 18:05:46.844256+00	
00000000-0000-0000-0000-000000000000	acb45711-6587-4365-8c9d-b91fb463705b	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 18:09:56.473864+00	
00000000-0000-0000-0000-000000000000	741be809-f2e5-4940-a114-64dce11c6582	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 18:39:52.735941+00	
00000000-0000-0000-0000-000000000000	135a6c15-d5ae-4dec-88d4-50229be5be91	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 18:39:52.758032+00	
00000000-0000-0000-0000-000000000000	bfcddfd8-8160-4c5b-8ea8-b9c7fb188b27	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 18:40:00.933479+00	
00000000-0000-0000-0000-000000000000	56d08ff0-5fc1-41b3-979b-2980c0b56796	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:13:26.394098+00	
00000000-0000-0000-0000-000000000000	682897ea-16cf-47b3-b4e8-e5d821744f3a	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:13:26.423382+00	
00000000-0000-0000-0000-000000000000	ed8ce499-22e5-486a-a915-38c55a0f0d7a	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:42:36.366512+00	
00000000-0000-0000-0000-000000000000	2cb37d99-909a-4b87-9308-e681d5e7b304	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:42:36.365243+00	
00000000-0000-0000-0000-000000000000	0ca2be2f-552a-4f71-a3a5-6b1731edb4cb	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:42:36.381881+00	
00000000-0000-0000-0000-000000000000	741228dc-5604-438b-a4c7-e78177738bff	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 19:42:36.382148+00	
00000000-0000-0000-0000-000000000000	740a5bcd-91db-4c49-8d83-4238df8365e5	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 17:13:10.065458+00	
00000000-0000-0000-0000-000000000000	0059436b-89c6-4b9d-9e6a-56f202e94705	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 17:13:10.07015+00	
00000000-0000-0000-0000-000000000000	4a06f20e-9d05-4e91-bb64-a43f2ab37e1d	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 17:13:10.075518+00	
00000000-0000-0000-0000-000000000000	876a1f2a-8b65-4439-9289-810ee3c0575d	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 17:13:10.077666+00	
00000000-0000-0000-0000-000000000000	23d154d2-e409-4143-966f-b1ed678e6f06	{"action":"login","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-14 17:13:15.307209+00	
00000000-0000-0000-0000-000000000000	5d152737-caa9-4b36-a3d5-8464d70f6205	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 18:12:23.828076+00	
00000000-0000-0000-0000-000000000000	5beccd09-2bee-446b-aa03-595e551188bf	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 18:12:23.828092+00	
00000000-0000-0000-0000-000000000000	c912efae-e2cd-41c3-b1df-aaa765adcd19	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 18:12:23.869824+00	
00000000-0000-0000-0000-000000000000	c9a1180a-4c56-4bf2-82ac-feacd1ba92fa	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 18:12:23.869467+00	
00000000-0000-0000-0000-000000000000	090ddf13-0f3f-45ee-aa9e-dae4ed57776b	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 19:14:41.163659+00	
00000000-0000-0000-0000-000000000000	c90bad62-5724-4d8a-9549-814713d66cb3	{"action":"token_refreshed","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 19:14:41.163678+00	
00000000-0000-0000-0000-000000000000	c0aff546-5802-49a4-a12c-a6f1f4c3dde0	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 19:14:41.184235+00	
00000000-0000-0000-0000-000000000000	0b77c00e-bf53-46c8-bf22-1f10f36be4a0	{"action":"token_revoked","actor_id":"db93c961-5f77-41d3-96d2-9b50eaabb3ab","actor_username":"stasvolohovish@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-14 19:14:41.183981+00	
\.


--
-- TOC entry 5098 (class 0 OID 16927)
-- Dependencies: 380
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- TOC entry 5089 (class 0 OID 16725)
-- Dependencies: 371
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
db93c961-5f77-41d3-96d2-9b50eaabb3ab	db93c961-5f77-41d3-96d2-9b50eaabb3ab	{"sub": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "email": "stasvolohovish@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-11 20:22:56.44003+00	2025-09-11 20:22:56.4401+00	2025-09-11 20:22:56.4401+00	40b1994b-3043-4022-92e0-50a3e6d478d6
\.


--
-- TOC entry 5083 (class 0 OID 16518)
-- Dependencies: 362
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5093 (class 0 OID 16814)
-- Dependencies: 375
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
60a84278-b645-4330-8f2a-ca62cf4888dc	2025-09-12 10:58:15.854594+00	2025-09-12 10:58:15.854594+00	otp	1d42b780-9f0a-4da2-9a12-a63306f76aa1
087e17ff-310e-42bf-8bc8-f49852d6eaa3	2025-09-12 11:09:50.944915+00	2025-09-12 11:09:50.944915+00	password	8dc82b7c-2cd0-4818-b403-0f0a40cf92fe
195ab3de-240e-48aa-bf5f-9df363ac655f	2025-09-12 12:11:47.48985+00	2025-09-12 12:11:47.48985+00	password	5b4ab6e8-78ad-409a-963e-1dd0c1bbc6d2
afbe87d9-7c0e-4bd5-bafa-bc734e17bafc	2025-09-12 18:05:46.885433+00	2025-09-12 18:05:46.885433+00	password	798bbb84-7e86-480d-9e79-7465ebd535da
39c858c8-661d-4cbb-89f3-480c115b773e	2025-09-12 18:09:56.480191+00	2025-09-12 18:09:56.480191+00	password	1b318533-3161-4f2d-b57d-1d21e3a77ec2
ce6af260-7594-48c9-b562-5b89b316b587	2025-09-12 18:40:00.947846+00	2025-09-12 18:40:00.947846+00	password	5970080c-0d65-4ed2-86d0-8b4e4fd49c31
b7989a78-412a-49dd-95a9-5f560a743616	2025-09-14 17:13:15.313697+00	2025-09-14 17:13:15.313697+00	password	75c01d90-e3b3-423b-b054-61daf24f13e3
\.


--
-- TOC entry 5092 (class 0 OID 16802)
-- Dependencies: 374
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- TOC entry 5091 (class 0 OID 16789)
-- Dependencies: 373
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- TOC entry 5107 (class 0 OID 33357)
-- Dependencies: 393
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 5099 (class 0 OID 16977)
-- Dependencies: 381
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5082 (class 0 OID 16507)
-- Dependencies: 361
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	66	xsv3uovxap5e	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-12 10:58:15.826723+00	2025-09-12 10:58:15.826723+00	\N	60a84278-b645-4330-8f2a-ca62cf4888dc
00000000-0000-0000-0000-000000000000	67	bkjvlpp2d6jl	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-12 11:09:50.932747+00	2025-09-12 11:09:50.932747+00	\N	087e17ff-310e-42bf-8bc8-f49852d6eaa3
00000000-0000-0000-0000-000000000000	68	whsasy6ttb7q	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 12:11:47.443351+00	2025-09-12 13:10:27.955366+00	\N	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	69	5lchnntcnfna	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 13:10:27.992092+00	2025-09-12 14:27:09.125082+00	whsasy6ttb7q	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	70	gsnwnqiqkrbn	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 14:27:09.152523+00	2025-09-12 15:54:27.445377+00	5lchnntcnfna	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	73	fozhrqxymm64	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-12 18:09:56.477045+00	2025-09-12 18:09:56.477045+00	\N	39c858c8-661d-4cbb-89f3-480c115b773e
00000000-0000-0000-0000-000000000000	71	avnnkcta4uzz	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 15:54:27.4536+00	2025-09-12 18:39:52.758733+00	gsnwnqiqkrbn	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	72	o547laopdyqn	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 18:05:46.869262+00	2025-09-12 19:13:26.424121+00	\N	afbe87d9-7c0e-4bd5-bafa-bc734e17bafc
00000000-0000-0000-0000-000000000000	76	j63ymkmzkihi	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-12 19:13:26.444026+00	2025-09-12 19:13:26.444026+00	o547laopdyqn	afbe87d9-7c0e-4bd5-bafa-bc734e17bafc
00000000-0000-0000-0000-000000000000	75	7l7f6gs66aeh	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 18:40:00.946238+00	2025-09-12 19:42:36.382827+00	\N	ce6af260-7594-48c9-b562-5b89b316b587
00000000-0000-0000-0000-000000000000	74	4odwkkzfoscb	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 18:39:52.779998+00	2025-09-12 19:42:36.382529+00	avnnkcta4uzz	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	78	ouzbcokg264d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 19:42:36.401227+00	2025-09-14 17:13:10.079505+00	7l7f6gs66aeh	ce6af260-7594-48c9-b562-5b89b316b587
00000000-0000-0000-0000-000000000000	77	ps2qxbxxq5fi	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-12 19:42:36.40123+00	2025-09-14 17:13:10.077703+00	4odwkkzfoscb	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	79	qb25fw2ncz74	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-14 17:13:10.092525+00	2025-09-14 17:13:10.092525+00	ouzbcokg264d	ce6af260-7594-48c9-b562-5b89b316b587
00000000-0000-0000-0000-000000000000	81	trinyae27grs	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-14 17:13:15.312333+00	2025-09-14 18:12:23.870646+00	\N	b7989a78-412a-49dd-95a9-5f560a743616
00000000-0000-0000-0000-000000000000	80	ug54ef3rvbue	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-14 17:13:10.092525+00	2025-09-14 18:12:23.870928+00	ps2qxbxxq5fi	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	83	wu5qevuip5sn	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-14 18:12:23.898872+00	2025-09-14 19:14:41.185035+00	trinyae27grs	b7989a78-412a-49dd-95a9-5f560a743616
00000000-0000-0000-0000-000000000000	82	lcsea25llavn	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	2025-09-14 18:12:23.898777+00	2025-09-14 19:14:41.186016+00	ug54ef3rvbue	195ab3de-240e-48aa-bf5f-9df363ac655f
00000000-0000-0000-0000-000000000000	84	dht7sagws5a5	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-14 19:14:41.207157+00	2025-09-14 19:14:41.207157+00	wu5qevuip5sn	b7989a78-412a-49dd-95a9-5f560a743616
00000000-0000-0000-0000-000000000000	85	36rgqvsljbgf	db93c961-5f77-41d3-96d2-9b50eaabb3ab	f	2025-09-14 19:14:41.207153+00	2025-09-14 19:14:41.207153+00	lcsea25llavn	195ab3de-240e-48aa-bf5f-9df363ac655f
\.


--
-- TOC entry 5096 (class 0 OID 16856)
-- Dependencies: 378
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- TOC entry 5097 (class 0 OID 16874)
-- Dependencies: 379
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- TOC entry 5085 (class 0 OID 16533)
-- Dependencies: 364
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
\.


--
-- TOC entry 5090 (class 0 OID 16755)
-- Dependencies: 372
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
60a84278-b645-4330-8f2a-ca62cf4888dc	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 10:58:15.813583+00	2025-09-12 10:58:15.813583+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	5.253.115.90	\N
087e17ff-310e-42bf-8bc8-f49852d6eaa3	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 11:09:50.930375+00	2025-09-12 11:09:50.930375+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	5.253.115.90	\N
b7989a78-412a-49dd-95a9-5f560a743616	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-14 17:13:15.308189+00	2025-09-14 19:14:41.226248+00	\N	aal1	\N	2025-09-14 19:14:41.225559	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0	37.19.218.145	\N
195ab3de-240e-48aa-bf5f-9df363ac655f	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 12:11:47.425638+00	2025-09-14 19:14:41.229593+00	\N	aal1	\N	2025-09-14 19:14:41.229487	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0	37.19.218.145	\N
39c858c8-661d-4cbb-89f3-480c115b773e	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 18:09:56.476013+00	2025-09-12 18:09:56.476013+00	\N	aal1	\N	\N	curl/8.14.1	5.253.115.90	\N
afbe87d9-7c0e-4bd5-bafa-bc734e17bafc	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 18:05:46.857596+00	2025-09-12 19:13:26.464604+00	\N	aal1	\N	2025-09-12 19:13:26.464508	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	5.253.115.90	\N
ce6af260-7594-48c9-b562-5b89b316b587	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-12 18:40:00.939433+00	2025-09-14 17:13:10.108462+00	\N	aal1	\N	2025-09-14 17:13:10.10837	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0	156.146.50.134	\N
\.


--
-- TOC entry 5095 (class 0 OID 16841)
-- Dependencies: 377
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5094 (class 0 OID 16832)
-- Dependencies: 376
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- TOC entry 5080 (class 0 OID 16495)
-- Dependencies: 359
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	db93c961-5f77-41d3-96d2-9b50eaabb3ab	authenticated	authenticated	stasvolohovish@gmail.com	$2a$10$8Z06wuG9rJmCNdO9hIBZ1.4UkSitOqvi3EEnNzjDVtqmAov1MhzQ2	2025-09-11 20:22:56.467489+00	\N		\N		\N			\N	2025-09-14 17:13:15.308109+00	{"role": "admin", "provider": "email", "providers": ["email"]}	{"role": "admin", "email_verified": true}	\N	2025-09-11 20:22:56.392206+00	2025-09-14 19:14:41.21747+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- TOC entry 5119 (class 0 OID 42970)
-- Dependencies: 405
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (id, user_id, kind, name, line1, line2, city, postal_code, country, phone, is_default, created_at) FROM stdin;
\.


--
-- TOC entry 5126 (class 0 OID 43211)
-- Dependencies: 412
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, actor, action, entity, payload, created_at) FROM stdin;
\.


--
-- TOC entry 5116 (class 0 OID 42844)
-- Dependencies: 402
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, product_id, variant_id, qty, price_at_add, created_at) FROM stdin;
\.


--
-- TOC entry 5115 (class 0 OID 42832)
-- Dependencies: 401
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, user_id, created_at) FROM stdin;
665a3a86-edfb-4f51-9162-80095d5770d2	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-09-14 12:26:10.339834+00
\.


--
-- TOC entry 5123 (class 0 OID 43122)
-- Dependencies: 409
-- Data for Name: coupon_redemptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupon_redemptions (code, user_id, order_id, redeemed_at) FROM stdin;
\.


--
-- TOC entry 5122 (class 0 OID 43112)
-- Dependencies: 408
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupons (code, kind, value, active, valid_from, valid_to, max_redemptions, created_at) FROM stdin;
\.


--
-- TOC entry 5111 (class 0 OID 42650)
-- Dependencies: 397
-- Data for Name: ecom_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ecom_categories (id, slug, name, icon, created_at) FROM stdin;
46995675-0143-4827-b8b7-320bc836bf26	electronics	Electronics	Cpu	2025-09-08 12:36:13.64594+00
f1f71606-133d-479c-a80b-d5b503b726f5	gaming	Gaming	Gamepad2	2025-09-08 12:36:13.64594+00
eaed4c73-141d-4ddf-abb5-6f1e6677e510	accessories	Accessories	Headphones	2025-09-08 12:36:13.64594+00
2be8525a-ad49-4903-9427-e0d2e00fc6bf	home	Home	Home	2025-09-08 12:36:13.64594+00
3cc92d71-9db9-4919-8c96-41385f5c44c8	outdoors	Outdoors	Tent	2025-09-08 12:36:13.64594+00
d71d1b2a-982c-4246-962e-bd55e0c25626	software	Software	Box	2025-09-08 12:36:13.64594+00
\.


--
-- TOC entry 5112 (class 0 OID 42661)
-- Dependencies: 398
-- Data for Name: ecom_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ecom_products (id, slug, title, price, rating, images, category_slug, tags, short_desc, specs, created_at, status) FROM stdin;
ec2db82a-5df4-40f9-ae91-4643a88d6363	beta-keyboard	Beta Mechanical Keyboard	59.99	4.2	["https://via.placeholder.com/800x500?text=Keyboard"]	accessories	{keyboard}	Compact 75% mechanical keyboard with RGB.	{"Switches": "Brown"}	2025-09-08 12:36:13.64594+00	published
ae5ecb4d-e4f8-42b1-95b3-08dd11f34ce2	gamma-mouse	Gamma Gaming Mouse	39.99	4.1	["https://via.placeholder.com/800x500?text=Mouse"]	gaming	{mouse}	Lightweight mouse with precise sensor.	{"DPI": "16000"}	2025-09-08 12:36:13.64594+00	published
5644a0f5-d806-4205-806e-c2db41a63f4b	omega-monitor	Omega 27\\' Monitor	229.00	4.6	["https://via.placeholder.com/800x500?text=Monitor"]	electronics	{display}	27-inch 144Hz IPS monitor.	{"Refresh": "144Hz"}	2025-09-08 12:36:13.64594+00	published
ffa6a259-1276-4cbc-9b56-d00ccdcdc0e2	delta-speaker	Delta Bluetooth Speaker	45.00	4	["https://via.placeholder.com/800x500?text=Speaker"]	electronics	{audio}	Portable speaker with rich sound.	{"Battery": "12h"}	2025-09-08 12:36:13.64594+00	published
424074d8-8a04-475a-965f-afcfee85a3a1	epsilon-smartlight	Epsilon Smart Lightkguhjррера	19.99	3.9	["https://via.placeholder.com/800x500?text=Light"]	home	{light}	Smart LED bulb with app control.	{"Socket": "E27"}	2025-09-08 12:36:13.64594+00	published
b3083e86-3eaa-474f-9e53-8392375079aa	alpha-headphones-copy	Alpha Headphones	79.99	4.4	["https://via.placeholder.com/800x500?text=Alpha"]	accessories	{audio,wireless}	Comfortable over-ear wireless headphones.	{"Connectivity": "Bluetooth 5.2"}	2025-09-08 12:36:13.64594+00	published
03dbd39a-a6da-49a2-9047-820c4aeb9de9	omega-monitor-copy	Omega 27\\' Monitor	229.00	4.6	["https://via.placeholder.com/800x500?text=Monitor"]	electronics	{display}	27-inch 144Hz IPS monitor.	{"Refresh": "144Hz"}	2025-09-08 12:36:13.64594+00	published
b22454fe-a849-438d-bf9c-2a70f55f447b	gamma-mouse-copy	Gamma Gaming Mouse	39.99	4.1	["https://via.placeholder.com/800x500?text=Mouse"]	gaming	{mouse}	Lightweight mouse with precise sensor.	{"DPI": "16000"}	2025-09-08 12:36:13.64594+00	published
fa18729a-8aaa-4552-9f6c-bc9851102af3	beta-keyboard-copy	Beta Mechanical Keyboard	59.99	4.2	["https://via.placeholder.com/800x500?text=Keyboard"]	accessories	{keyboard}	Compact 75% mechanical keyboard with RGB.	{"Switches": "Brown"}	2025-09-08 12:36:13.64594+00	published
0860cae1-9903-47b4-a072-06a6ffd84922	ыафаы-copy-copy	хуй резиновый	10000.00	5	[]	accessories	{}	ыфаыфаафа	{}	2025-09-12 11:19:08.790829+00	published
80445305-ae28-4966-a4dd-1869cfcc5fd6	ыафаы-copy	хуй резиновый	100.00	5	[]	accessories	{}	ыфаыфаафа	{}	2025-09-12 11:19:08.790829+00	published
e9d235b6-85d8-4832-aa10-8b5a20297868	ыафаы	хуй резиновый	99.99	5	[]	accessories	{}	ыфаыфаафа	{}	2025-09-12 11:19:08.790829+00	published
b370b425-3732-4311-b65d-044adf205e31	alpha-headphones	Alpha Headphones	80.00	4.4	["https://via.placeholder.com/800x500?text=Alpha"]	accessories	{audio,wireless}	Comfortable over-ear wireless headphones.	{"Connectivity": "Bluetooth 5.2"}	2025-09-08 12:36:13.64594+00	published
75eda06d-d7d4-4b18-8f32-d01905e2e046	егг	ооо	0.00	0	[]	electronics	{}	аппо	{}	2025-09-14 17:21:03.616714+00	published
\.


--
-- TOC entry 5113 (class 0 OID 42681)
-- Dependencies: 399
-- Data for Name: ecom_wishlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ecom_wishlist (user_id, product_id, created_at) FROM stdin;
\.


--
-- TOC entry 5165 (class 0 OID 63605)
-- Dependencies: 461
-- Data for Name: line_total_is_generated; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.line_total_is_generated ("coalesce") FROM stdin;
f
\.


--
-- TOC entry 5118 (class 0 OID 42906)
-- Dependencies: 404
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, variant_id, title, qty, unit_price) FROM stdin;
a73816a4-45df-4938-981f-9b7e860e72f8	bec40d61-b213-42ea-8ad3-d4f5a2f94523	ec2db82a-5df4-40f9-ae91-4643a88d6363	\N	Beta Mechanical Keyboard	1	999.99
a61cac76-fa26-4435-9845-10468f37559f	1fc9494d-cc20-4e5f-83a5-38525e096169	0860cae1-9903-47b4-a072-06a6ffd84922	\N	хуй резиновый	2	123.45
08f1eead-4458-4ee7-99a9-10186b7dc00a	a00da6ef-4fb1-4001-9a59-734b379c17f5	0860cae1-9903-47b4-a072-06a6ffd84922	\N	хуй резиновый	1	10000.00
b15364f2-cc01-4a48-a735-d1857be14584	37781838-9399-459b-b8b0-2f08c94c4f2a	0860cae1-9903-47b4-a072-06a6ffd84922	\N	хуй резиновый	5	10000.00
cae4d201-73a6-4134-8e36-e90867eed0f3	2ba1607c-d94e-413f-bfe7-06e19b6db43c	e9d235b6-85d8-4832-aa10-8b5a20297868	\N	хуй резиновый	1	99.99
\.


--
-- TOC entry 5117 (class 0 OID 42886)
-- Dependencies: 403
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, status, subtotal, discount_total, shipping_total, grand_total, currency, created_at, paid_at, cancelled_at) FROM stdin;
a00da6ef-4fb1-4001-9a59-734b379c17f5	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	10000.00	0.00	0.00	10000.00	EUR	2025-09-14 14:35:21.225015+00	\N	\N
bec40d61-b213-42ea-8ad3-d4f5a2f94523	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	999.99	0.00	0.00	999.99	EUR	2025-09-14 13:29:46.648063+00	\N	\N
1fc9494d-cc20-4e5f-83a5-38525e096169	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	246.90	0.00	0.00	246.90	EUR	2025-09-14 14:20:34.402571+00	\N	\N
f08c5f7d-6e70-4137-b072-9da60039929d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 14:28:34.994943+00	\N	\N
6eb2d400-6509-427d-941e-8ef0d9cea063	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 14:30:01.080827+00	\N	\N
07ef0878-481e-48b1-ac99-276029a02970	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 14:30:14.645991+00	\N	\N
c841319a-dfd0-42e1-bb4c-173fca418423	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 17:26:24.603622+00	\N	\N
fd974aa4-4620-48fe-a8c3-ade56508d7cd	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 17:41:58.396724+00	\N	\N
fe75673f-3eb3-49d1-82bf-9f2866fd232a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 17:42:09.423909+00	\N	\N
f6ae1513-2c68-4e58-8ac1-08b4ace3d95a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	0.00	0.00	0.00	0.00	EUR	2025-09-14 17:42:30.377072+00	\N	\N
37781838-9399-459b-b8b0-2f08c94c4f2a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	50000.00	0.00	0.00	50000.00	EUR	2025-09-14 18:19:59.615565+00	\N	\N
2ba1607c-d94e-413f-bfe7-06e19b6db43c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	pending	99.99	0.00	0.00	99.99	EUR	2025-09-14 18:20:21.54663+00	\N	\N
\.


--
-- TOC entry 5121 (class 0 OID 43046)
-- Dependencies: 407
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, provider, provider_ref, amount, currency, status, created_at) FROM stdin;
dcbef4a5-2398-4a44-806f-ba943fb45192	bec40d61-b213-42ea-8ad3-d4f5a2f94523	testpay	simulated-123	999.99	EUR	succeeded	2025-09-14 13:32:08.928683+00
55bc625e-9131-41be-975b-7109f17c052c	a00da6ef-4fb1-4001-9a59-734b379c17f5	test	manual-ok	10000.00	EUR	succeeded	2025-09-14 14:38:36.717712+00
\.


--
-- TOC entry 5160 (class 0 OID 58814)
-- Dependencies: 452
-- Data for Name: product_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_catalog (product_uid, source_schema, source_table, source_pk, title, slug, created_at) FROM stdin;
f7ceea08-4485-45c0-948e-89b8c532167c	public	ecom_products	ec2db82a-5df4-40f9-ae91-4643a88d6363	Beta Mechanical Keyboard	beta-keyboard	2025-09-12 15:20:14.059607+00
2793fb97-6bc3-457b-9ce9-e54676a8bf00	public	ecom_products	ae5ecb4d-e4f8-42b1-95b3-08dd11f34ce2	Gamma Gaming Mouse	gamma-mouse	2025-09-12 15:20:14.059607+00
4b866902-f1df-40bf-9bbb-8a5ba7a06e95	public	ecom_products	5644a0f5-d806-4205-806e-c2db41a63f4b	Omega 27\\' Monitor	omega-monitor	2025-09-12 15:20:14.059607+00
10367f0d-6ea8-42f1-8a42-5b088f861e81	public	ecom_products	ffa6a259-1276-4cbc-9b56-d00ccdcdc0e2	Delta Bluetooth Speaker	delta-speaker	2025-09-12 15:20:14.059607+00
68ed32db-0410-4a10-a02f-217593a6160f	public	ecom_products	424074d8-8a04-475a-965f-afcfee85a3a1	Epsilon Smart Lightkguhjррера	epsilon-smartlight	2025-09-12 15:20:14.059607+00
aeb62343-615e-4b13-b839-fa88124cb09b	public	ecom_products	b3083e86-3eaa-474f-9e53-8392375079aa	Alpha Headphones	alpha-headphones-copy	2025-09-12 15:20:14.059607+00
8f5dcb54-66bb-48e9-b8e6-5540c8b4748b	public	ecom_products	03dbd39a-a6da-49a2-9047-820c4aeb9de9	Omega 27\\' Monitor	omega-monitor-copy	2025-09-12 15:20:14.059607+00
719e10e8-723c-4739-b399-6951ccbe0188	public	ecom_products	b22454fe-a849-438d-bf9c-2a70f55f447b	Gamma Gaming Mouse	gamma-mouse-copy	2025-09-12 15:20:14.059607+00
765f0022-544f-44d6-81c5-3b599b9fe9d6	public	ecom_products	fa18729a-8aaa-4552-9f6c-bc9851102af3	Beta Mechanical Keyboard	beta-keyboard-copy	2025-09-12 15:20:14.059607+00
770c867c-7c0c-4dcb-849c-47438eb99f8d	public	ecom_products	0860cae1-9903-47b4-a072-06a6ffd84922	хуй резиновый	ыафаы-copy-copy	2025-09-12 15:20:14.059607+00
c6ee40db-3b08-46f1-90d0-b5db102a4ee5	public	ecom_products	80445305-ae28-4966-a4dd-1869cfcc5fd6	хуй резиновый	ыафаы-copy	2025-09-12 15:20:14.059607+00
f662d07f-25bc-4df1-99f7-85c5996f10d6	public	ecom_products	e9d235b6-85d8-4832-aa10-8b5a20297868	хуй резиновый	ыафаы	2025-09-12 15:20:14.059607+00
2f6be8d4-d1f9-43af-a59e-92e81480285d	public	ecom_products	b370b425-3732-4311-b65d-044adf205e31	Alpha Headphones	alpha-headphones	2025-09-12 15:20:14.059607+00
e629fcbb-ae51-4a67-9d33-53980989f0bc	shop	products	1	Test Laptop	-est-aptop	2025-09-12 15:20:14.059607+00
f09369f1-68c0-4aa7-863a-7c97f2dcd26e	shop	products	10	Demo Laptop	\N	2025-09-12 15:20:14.059607+00
36f137ae-527b-4fb5-a50d-f054e803b84a	public	ecom_products	75eda06d-d7d4-4b18-8f32-d01905e2e046	ооо	егг	2025-09-14 17:21:04.031191+00
\.


--
-- TOC entry 5162 (class 0 OID 58842)
-- Dependencies: 454
-- Data for Name: product_rating_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_rating_stats (product_uid, avg_rating, ratings_count, updated_at) FROM stdin;
f7ceea08-4485-45c0-948e-89b8c532167c	5.00	2	2025-09-12 18:15:02.017098+00
10367f0d-6ea8-42f1-8a42-5b088f861e81	5.00	1	2025-09-14 11:36:45.652419+00
\.


--
-- TOC entry 5157 (class 0 OID 56370)
-- Dependencies: 448
-- Data for Name: product_reviews_raw; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_reviews_raw (product_id, user_id, rating, title, body, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5114 (class 0 OID 42796)
-- Dependencies: 400
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (user_id, full_name, avatar_url, created_at) FROM stdin;
\.


--
-- TOC entry 5163 (class 0 OID 58855)
-- Dependencies: 455
-- Data for Name: review_rate_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.review_rate_limits (ip_hash, last_at, count_24h) FROM stdin;
testhash-demo	2025-09-12 15:46:58.976059+00	2
ef4c3104b708c184d3cae4065cc43b16ecdd17d05dbe32708fe722d52f0bc401	2025-09-12 18:13:45.0324+00	2
iphash-demo	2025-09-14 11:32:23.637504+00	1
\.


--
-- TOC entry 5158 (class 0 OID 57156)
-- Dependencies: 449
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (product_id, user_id, rating, title, body, status, created_at, updated_at) FROM stdin;
10	00000000-0000-0000-0000-000000000000	5	Great	Works as expected	approved	2025-09-09 18:20:04.15842+00	2025-09-11 18:17:42.491209+00
1	00000000-0000-0000-0000-000000000000	5	Отлично	Беру два	approved	2025-09-09 20:08:24.608088+00	2025-09-11 18:17:42.491209+00
\.


--
-- TOC entry 5124 (class 0 OID 43166)
-- Dependencies: 410
-- Data for Name: reviews__backup_20250909_181553; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews__backup_20250909_181553 (id, product_id, user_id, rating, content, created_at) FROM stdin;
\.


--
-- TOC entry 5161 (class 0 OID 58826)
-- Dependencies: 453
-- Data for Name: reviews_unified; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews_unified (id, product_uid, rating, title, body, ip_hash, user_agent, created_at, status, user_id) FROM stdin;
81e33540-a063-41e3-ac16-3fea683c8d99	f7ceea08-4485-45c0-948e-89b8c532167c	5	Тестовый отзыв	Очень годная клавиатура	testhash-demo	ua-demo	2025-09-12 15:46:58.976059+00	rejected	03dbd39a-a6da-49a2-9047-820c4aeb9de9
66da7733-efdc-4f85-b897-2538c19d3aa5	f7ceea08-4485-45c0-948e-89b8c532167c	5	Тестовый отзыв	Очень годная клавиатура	testhash-demo	ua-demo	2025-09-12 15:46:47.730118+00	approved	03dbd39a-a6da-49a2-9047-820c4aeb9de9
c6683a4d-3b74-4797-b5c2-69e4b9b2601d	f7ceea08-4485-45c0-948e-89b8c532167c	4	OK	????	ef4c3104b708c184d3cae4065cc43b16ecdd17d05dbe32708fe722d52f0bc401	curl/8.14.1	2025-09-12 17:55:27.589514+00	pending	\N
bdcff639-8c4b-415e-a416-831e1969ccef	f7ceea08-4485-45c0-948e-89b8c532167c	5	???????? ????	???????? ??????? ? ???????.	ef4c3104b708c184d3cae4065cc43b16ecdd17d05dbe32708fe722d52f0bc401	curl/8.14.1	2025-09-12 18:13:45.0324+00	approved	db93c961-5f77-41d3-96d2-9b50eaabb3ab
99228835-233d-43b0-abbf-201ebbdd250f	10367f0d-6ea8-42f1-8a42-5b088f861e81	5	Тестовый заголовок	Тестовый текст	iphash-demo	ua-demo	2025-09-14 11:32:23.637504+00	approved	10367f0d-6ea8-42f1-8a42-5b088f861e81
\.


--
-- TOC entry 5159 (class 0 OID 57421)
-- Dependencies: 451
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, updated_at) FROM stdin;
\.


--
-- TOC entry 5120 (class 0 OID 43008)
-- Dependencies: 406
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipments (id, order_id, carrier, tracking_number, status, created_at) FROM stdin;
\.


--
-- TOC entry 5164 (class 0 OID 63602)
-- Dependencies: 460
-- Data for Name: total_is_generated; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.total_is_generated ("coalesce") FROM stdin;
t
\.


--
-- TOC entry 5100 (class 0 OID 17003)
-- Dependencies: 382
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2025-08-21 20:11:25
20211116045059	2025-08-21 20:11:27
20211116050929	2025-08-21 20:11:29
20211116051442	2025-08-21 20:11:30
20211116212300	2025-08-21 20:11:32
20211116213355	2025-08-21 20:11:34
20211116213934	2025-08-21 20:11:35
20211116214523	2025-08-21 20:11:38
20211122062447	2025-08-21 20:11:39
20211124070109	2025-08-21 20:11:41
20211202204204	2025-08-21 20:11:43
20211202204605	2025-08-21 20:11:44
20211210212804	2025-08-21 20:11:49
20211228014915	2025-08-21 20:11:51
20220107221237	2025-08-21 20:11:53
20220228202821	2025-08-21 20:11:54
20220312004840	2025-08-21 20:11:56
20220603231003	2025-08-21 20:11:58
20220603232444	2025-08-21 20:12:00
20220615214548	2025-08-21 20:12:02
20220712093339	2025-08-21 20:12:03
20220908172859	2025-08-21 20:12:05
20220916233421	2025-08-21 20:12:07
20230119133233	2025-08-21 20:12:08
20230128025114	2025-08-21 20:12:11
20230128025212	2025-08-21 20:12:12
20230227211149	2025-08-21 20:12:14
20230228184745	2025-08-21 20:12:15
20230308225145	2025-08-21 20:12:17
20230328144023	2025-08-21 20:12:18
20231018144023	2025-08-21 20:12:20
20231204144023	2025-08-21 20:12:23
20231204144024	2025-08-21 20:12:25
20231204144025	2025-08-21 20:12:26
20240108234812	2025-08-21 20:12:28
20240109165339	2025-08-21 20:12:29
20240227174441	2025-08-21 20:12:32
20240311171622	2025-08-21 20:12:34
20240321100241	2025-08-21 20:12:38
20240401105812	2025-08-21 20:12:42
20240418121054	2025-08-21 20:12:45
20240523004032	2025-08-21 20:12:50
20240618124746	2025-08-21 20:12:52
20240801235015	2025-08-21 20:12:54
20240805133720	2025-08-21 20:12:55
20240827160934	2025-08-21 20:12:57
20240919163303	2025-08-21 20:12:59
20240919163305	2025-08-21 20:13:01
20241019105805	2025-08-21 20:13:02
20241030150047	2025-08-21 20:13:09
20241108114728	2025-08-21 20:13:11
20241121104152	2025-08-21 20:13:12
20241130184212	2025-08-21 20:13:15
20241220035512	2025-08-21 20:13:16
20241220123912	2025-08-21 20:13:18
20241224161212	2025-08-21 20:13:19
20250107150512	2025-08-21 20:13:21
20250110162412	2025-08-21 20:13:23
20250123174212	2025-08-21 20:13:24
20250128220012	2025-08-21 20:13:26
20250506224012	2025-08-21 20:13:27
20250523164012	2025-08-21 20:13:29
20250714121412	2025-08-21 20:13:30
\.


--
-- TOC entry 5104 (class 0 OID 17109)
-- Dependencies: 387
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- TOC entry 5128 (class 0 OID 45549)
-- Dependencies: 414
-- Data for Name: categories; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.categories (id, slug, name) FROM stdin;
1	laptops	Laptops
\.


--
-- TOC entry 5138 (class 0 OID 45708)
-- Dependencies: 424
-- Data for Name: customers; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.customers (id, email, created_at) FROM stdin;
\.


--
-- TOC entry 5142 (class 0 OID 45742)
-- Dependencies: 428
-- Data for Name: order_items; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.order_items (id, order_id, product_id, variant_id, qty, price) FROM stdin;
\.


--
-- TOC entry 5140 (class 0 OID 45721)
-- Dependencies: 426
-- Data for Name: orders; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.orders (id, customer_id, status, subtotal, discount_total, total, currency, created_at) FROM stdin;
\.


--
-- TOC entry 5132 (class 0 OID 45581)
-- Dependencies: 418
-- Data for Name: product_images; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.product_images (id, product_id, url, sort_order) FROM stdin;
\.


--
-- TOC entry 5130 (class 0 OID 45561)
-- Dependencies: 416
-- Data for Name: products; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.products (id, sku, title, description, price, currency, category_id, is_active, created_at, slug) FROM stdin;
1	SKU-1	Test Laptop	\N	999.99	EUR	1	t	2025-09-09 18:03:08.660372+00	-est-aptop
10	SKU-10	Demo Laptop	\N	1299.99	EUR	1	t	2025-09-09 18:20:04.15842+00	\N
\.


--
-- TOC entry 5137 (class 0 OID 45674)
-- Dependencies: 423
-- Data for Name: promotions; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.promotions (id, name, type, value, starts_at, ends_at, coupon_code, is_stackable, conditions) FROM stdin;
\.


--
-- TOC entry 5144 (class 0 OID 45789)
-- Dependencies: 430
-- Data for Name: reviews; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.reviews (id, product_id, user_id, rating, title, body, created_at, status) FROM stdin;
1	10	6fed2f53-2669-48d8-874d-418f6d26c3e0	5	Great	Works as expected	2025-09-09 18:20:04.15842+00	rejected
2	1	5c98390d-66e7-4c88-a542-fad6a71ab031	5	Отлично	Беру два	2025-09-09 20:08:24.608088+00	approved
3	10	d50315ca-2137-4433-9d52-486670bed5e0	5	Отлично	Беру два	2025-09-09 20:08:24.608088+00	approved
\.


--
-- TOC entry 5135 (class 0 OID 45633)
-- Dependencies: 421
-- Data for Name: stock; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.stock (variant_id, qty, updated_at) FROM stdin;
\.


--
-- TOC entry 5134 (class 0 OID 45618)
-- Dependencies: 420
-- Data for Name: variants; Type: TABLE DATA; Schema: shop; Owner: postgres
--

COPY shop.variants (id, product_id, name, price_override, sku) FROM stdin;
\.


--
-- TOC entry 5086 (class 0 OID 16546)
-- Dependencies: 365
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- TOC entry 5106 (class 0 OID 21242)
-- Dependencies: 392
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (id, type, format, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5088 (class 0 OID 16588)
-- Dependencies: 367
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2025-08-21 20:11:22.108719
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2025-08-21 20:11:22.118446
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2025-08-21 20:11:22.126028
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2025-08-21 20:11:22.185867
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2025-08-21 20:11:22.232736
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2025-08-21 20:11:22.238339
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2025-08-21 20:11:22.245053
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2025-08-21 20:11:22.257021
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2025-08-21 20:11:22.262423
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2025-08-21 20:11:22.26788
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2025-08-21 20:11:22.274005
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2025-08-21 20:11:22.282375
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2025-08-21 20:11:22.291002
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2025-08-21 20:11:22.296275
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2025-08-21 20:11:22.302115
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2025-08-21 20:11:22.331496
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2025-08-21 20:11:22.337587
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2025-08-21 20:11:22.343032
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2025-08-21 20:11:22.350382
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2025-08-21 20:11:22.358365
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2025-08-21 20:11:22.365381
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2025-08-21 20:11:22.373591
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2025-08-21 20:11:22.422455
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2025-08-21 20:11:22.435884
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2025-08-21 20:11:22.441482
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2025-08-21 20:11:22.446773
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2025-08-24 20:27:49.843378
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2025-08-24 20:27:49.901021
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2025-08-24 20:27:49.911966
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2025-08-24 20:27:49.918567
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2025-08-24 20:27:49.927763
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2025-08-24 20:27:50.058827
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2025-08-24 20:27:50.066278
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2025-08-24 20:27:50.073161
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2025-08-24 20:27:50.074824
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2025-08-24 20:27:50.082534
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2025-08-24 20:27:50.088898
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2025-08-24 20:27:50.095973
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2025-08-24 20:27:50.100063
\.


--
-- TOC entry 5087 (class 0 OID 16561)
-- Dependencies: 366
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
\.


--
-- TOC entry 5105 (class 0 OID 21197)
-- Dependencies: 391
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5101 (class 0 OID 17040)
-- Dependencies: 383
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- TOC entry 5102 (class 0 OID 17054)
-- Dependencies: 384
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- TOC entry 5108 (class 0 OID 34535)
-- Dependencies: 394
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
20250910144543	\N	add_something
20250911093632	{"-- public.reviews + RPC add_review\r\n-- Creates table, RLS policies, updated_at trigger and RPC for upsert\r\n\r\n-- helper: updated_at trigger function (idempotent)\r\ncreate or replace function public.set_updated_at()\r\nreturns trigger as $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$ language plpgsql","-- Use a distinct table name to avoid collision with existing views\r\ncreate table if not exists public.product_reviews (\r\n  product_id uuid not null references public.ecom_products(id) on delete cascade,\r\n  user_id uuid not null references auth.users(id) on delete cascade,\r\n  rating int not null check (rating >= 1 and rating <= 5),\r\n  title text not null,\r\n  body text not null,\r\n  status text not null default 'pending' check (status in ('pending','approved','rejected')),\r\n  created_at timestamptz not null default now(),\r\n  updated_at timestamptz not null default now(),\r\n  primary key (product_id, user_id)\r\n)","drop trigger if exists trg_product_reviews_updated_at on public.product_reviews","create trigger trg_product_reviews_updated_at\r\nbefore update on public.product_reviews\r\nfor each row execute function public.set_updated_at()","-- RLS\r\nalter table public.product_reviews enable row level security","-- public can read only approved reviews\r\ndrop policy if exists product_reviews_public_read_approved on public.product_reviews","create policy product_reviews_public_read_approved on public.product_reviews\r\n  for select using (status = 'approved')","-- only owner can insert or update own review\r\ndrop policy if exists product_reviews_owner_insert on public.product_reviews","create policy product_reviews_owner_insert on public.product_reviews\r\n  for insert with check (auth.uid() = user_id)","drop policy if exists product_reviews_owner_update on public.product_reviews","create policy product_reviews_owner_update on public.product_reviews\r\n  for update using (auth.uid() = user_id) with check (auth.uid() = user_id)","-- No delete policy (only service role will be able to delete)\r\n\r\n-- RPC: add_product_review (upsert current user's review), returns row\r\ncreate or replace function public.add_product_review(\r\n  p_product_id uuid,\r\n  p_rating int,\r\n  p_title text,\r\n  p_body text\r\n)\r\nreturns public.product_reviews\r\nlanguage plpgsql\r\nsecurity invoker\r\nset search_path = public\r\nas $$\r\ndeclare\r\n  v_uid uuid;\r\n  v_row public.product_reviews;\r\nbegin\r\n  select auth.uid() into v_uid;\r\n  if v_uid is null then\r\n    raise exception 'not_authenticated';\r\n  end if;\r\n\r\n  insert into public.product_reviews as r (product_id, user_id, rating, title, body, status)\r\n  values (p_product_id, v_uid, p_rating, coalesce(p_title,''), coalesce(p_body,''), 'pending')\r\n  on conflict (product_id, user_id)\r\n  do update set rating = excluded.rating,\r\n                title = excluded.title,\r\n                body = excluded.body,\r\n                status = 'pending',\r\n                updated_at = now()\r\n  returning * into v_row;\r\n  return v_row;\r\nend;\r\n$$","grant execute on function public.add_product_review(uuid,int,text,text) to authenticated"}	reviews_with_rpc
20250910160055	{"-- Добавить таблицу, если её ещё нет\r\ncreate table if not exists public.products (\r\n    id uuid primary key default gen_random_uuid(),\r\n    name text not null,\r\n    price numeric not null default 0,\r\n    created_at timestamptz not null default now()\r\n)","-- Добавить индекс, если нет\r\ncreate index if not exists products_price_idx on public.products(price)","-- Удалить таблицу (на случай отката)\r\n-- drop table if exists public.products"}	add_products_table
\.


--
-- TOC entry 5109 (class 0 OID 34542)
-- Dependencies: 395
-- Data for Name: seed_files; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.seed_files (path, hash) FROM stdin;
\.


--
-- TOC entry 5153 (class 0 OID 50826)
-- Dependencies: 440
-- Data for Name: audit_log; Type: TABLE DATA; Schema: sys; Owner: postgres
--

COPY sys.audit_log (id, ts, tbl, op, row_before, row_after, actor, ip) FROM stdin;
1	2025-09-09 18:03:08.660372+00	shop.products	I	\N	{"id": 1, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
2	2025-09-09 18:04:23.228143+00	shop.products	I	\N	{"id": 2, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:23.228143+00:00", "category_id": 1, "description": null}	\N	\N
3	2025-09-09 18:04:30.820008+00	shop.products	I	\N	{"id": 3, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:30.820008+00:00", "category_id": 1, "description": null}	\N	\N
4	2025-09-09 18:04:51.930348+00	shop.products	I	\N	{"id": 4, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:51.930348+00:00", "category_id": 1, "description": null}	\N	\N
5	2025-09-09 18:05:05.825548+00	shop.products	I	\N	{"id": 5, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:05:05.825548+00:00", "category_id": 1, "description": null}	\N	\N
6	2025-09-09 18:05:10.882599+00	shop.products	I	\N	{"id": 6, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:05:10.882599+00:00", "category_id": 1, "description": null}	\N	\N
7	2025-09-09 18:05:57.331276+00	shop.products	D	{"id": 2, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:23.228143+00:00", "category_id": 1, "description": null}	\N	\N	\N
8	2025-09-09 18:05:57.331276+00	shop.products	D	{"id": 3, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:30.820008+00:00", "category_id": 1, "description": null}	\N	\N	\N
9	2025-09-09 18:05:57.331276+00	shop.products	D	{"id": 4, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:04:51.930348+00:00", "category_id": 1, "description": null}	\N	\N	\N
10	2025-09-09 18:05:57.331276+00	shop.products	D	{"id": 5, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:05:05.825548+00:00", "category_id": 1, "description": null}	\N	\N	\N
11	2025-09-09 18:05:57.331276+00	shop.products	D	{"id": 6, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:05:10.882599+00:00", "category_id": 1, "description": null}	\N	\N	\N
12	2025-09-09 18:06:36.456279+00	shop.products	U	{"id": 1, "sku": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
13	2025-09-09 18:07:32.421798+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
14	2025-09-09 18:08:05.309931+00	shop.products	I	\N	{"id": 7, "sku": "SKU-7", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:05.309931+00:00", "category_id": 1, "description": null}	\N	\N
15	2025-09-09 18:08:10.830092+00	shop.products	I	\N	{"id": 8, "sku": "SKU-8", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:10.830092+00:00", "category_id": 1, "description": null}	\N	\N
16	2025-09-09 18:08:10.830092+00	shop.products	I	\N	{"id": 9, "sku": "SKU-9", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:10.830092+00:00", "category_id": 1, "description": null}	\N	\N
17	2025-09-09 18:08:31.932747+00	shop.products	D	{"id": 7, "sku": "SKU-7", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:05.309931+00:00", "category_id": 1, "description": null}	\N	\N	\N
18	2025-09-09 18:08:31.932747+00	shop.products	D	{"id": 8, "sku": "SKU-8", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:10.830092+00:00", "category_id": 1, "description": null}	\N	\N	\N
19	2025-09-09 18:08:31.932747+00	shop.products	D	{"id": 9, "sku": "SKU-9", "slug": null, "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:08:10.830092+00:00", "category_id": 1, "description": null}	\N	\N	\N
20	2025-09-09 18:20:04.15842+00	shop.products	I	\N	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
21	2025-09-09 20:08:16.266262+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
22	2025-09-09 20:08:16.266262+00	shop.products	U	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
23	2025-09-09 20:08:24.608088+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
24	2025-09-09 20:08:24.608088+00	shop.products	U	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
25	2025-09-09 20:08:41.437442+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
26	2025-09-09 20:08:41.437442+00	shop.products	U	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
27	2025-09-09 20:08:45.055675+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
28	2025-09-09 20:08:45.055675+00	shop.products	U	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
29	2025-09-09 20:08:58.439486+00	shop.products	U	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	{"id": 1, "sku": "SKU-1", "slug": "-est-aptop", "price": 999.99, "title": "Test Laptop", "search": "'laptop':2A 'test':1A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:03:08.660372+00:00", "category_id": 1, "description": null}	\N	\N
30	2025-09-09 20:08:58.439486+00	shop.products	U	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	{"id": 10, "sku": "SKU-10", "slug": null, "price": 1299.99, "title": "Demo Laptop", "search": "'demo':1A 'laptop':2A", "currency": "EUR", "is_active": true, "created_at": "2025-09-09T18:20:04.15842+00:00", "category_id": 1, "description": null}	\N	\N
\.


--
-- TOC entry 5151 (class 0 OID 50814)
-- Dependencies: 438
-- Data for Name: settings; Type: TABLE DATA; Schema: sys; Owner: postgres
--

COPY sys.settings (key, value, updated_at) FROM stdin;
\.


--
-- TOC entry 5155 (class 0 OID 50851)
-- Dependencies: 442
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: sys; Owner: postgres
--

COPY sys.webhook_logs (id, ts, source, status, payload, response) FROM stdin;
\.


--
-- TOC entry 4218 (class 0 OID 16658)
-- Dependencies: 368
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5565 (class 0 OID 0)
-- Dependencies: 435
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: aff; Owner: postgres
--

SELECT pg_catalog.setval('aff.events_id_seq', 1, false);


--
-- TOC entry 5566 (class 0 OID 0)
-- Dependencies: 433
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: aff; Owner: postgres
--

SELECT pg_catalog.setval('aff.offers_id_seq', 1, false);


--
-- TOC entry 5567 (class 0 OID 0)
-- Dependencies: 431
-- Name: sources_id_seq; Type: SEQUENCE SET; Schema: aff; Owner: postgres
--

SELECT pg_catalog.setval('aff.sources_id_seq', 1, false);


--
-- TOC entry 5568 (class 0 OID 0)
-- Dependencies: 360
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 87, true);


--
-- TOC entry 5569 (class 0 OID 0)
-- Dependencies: 411
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 396
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.offers_id_seq', 20, true);


--
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 386
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 413
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.categories_id_seq', 17, true);


--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 427
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.order_items_id_seq', 1, false);


--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 425
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.orders_id_seq', 1, false);


--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 417
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.product_images_id_seq', 1, false);


--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 415
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.products_id_seq', 10, true);


--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 422
-- Name: promotions_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.promotions_id_seq', 1, false);


--
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 429
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.reviews_id_seq', 3, true);


--
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 419
-- Name: variants_id_seq; Type: SEQUENCE SET; Schema: shop; Owner: postgres
--

SELECT pg_catalog.setval('shop.variants_id_seq', 1, false);


--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 439
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: sys; Owner: postgres
--

SELECT pg_catalog.setval('sys.audit_log_id_seq', 30, true);


--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 441
-- Name: webhook_logs_id_seq; Type: SEQUENCE SET; Schema: sys; Owner: postgres
--

SELECT pg_catalog.setval('sys.webhook_logs_id_seq', 1, false);


--
-- TOC entry 4663 (class 2606 OID 45906)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 4653 (class 2606 OID 45859)
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- TOC entry 4655 (class 2606 OID 45861)
-- Name: offers offers_slug_key; Type: CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.offers
    ADD CONSTRAINT offers_slug_key UNIQUE (slug);


--
-- TOC entry 4650 (class 2606 OID 45848)
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- TOC entry 4479 (class 2606 OID 16827)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 4434 (class 2606 OID 16531)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4502 (class 2606 OID 16933)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4458 (class 2606 OID 16951)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 4460 (class 2606 OID 16961)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 4432 (class 2606 OID 16524)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 4481 (class 2606 OID 16820)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 4477 (class 2606 OID 16808)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4469 (class 2606 OID 17001)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 4471 (class 2606 OID 16795)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 4530 (class 2606 OID 33370)
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- TOC entry 4533 (class 2606 OID 33368)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4506 (class 2606 OID 16986)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4426 (class 2606 OID 16514)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4429 (class 2606 OID 16738)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4491 (class 2606 OID 16867)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 4493 (class 2606 OID 16865)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4498 (class 2606 OID 16881)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4437 (class 2606 OID 16537)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4464 (class 2606 OID 16759)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4488 (class 2606 OID 16848)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 4483 (class 2606 OID 16839)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4419 (class 2606 OID 16921)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4421 (class 2606 OID 16501)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4581 (class 2606 OID 42981)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 4603 (class 2606 OID 43219)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4563 (class 2606 OID 42851)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4558 (class 2606 OID 42838)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4594 (class 2606 OID 43129)
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (code, user_id, redeemed_at);


--
-- TOC entry 4592 (class 2606 OID 43121)
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (code);


--
-- TOC entry 4539 (class 2606 OID 42658)
-- Name: ecom_categories ecom_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_categories
    ADD CONSTRAINT ecom_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4541 (class 2606 OID 42660)
-- Name: ecom_categories ecom_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_categories
    ADD CONSTRAINT ecom_categories_slug_key UNIQUE (slug);


--
-- TOC entry 4544 (class 2606 OID 42673)
-- Name: ecom_products ecom_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_pkey PRIMARY KEY (id);


--
-- TOC entry 4548 (class 2606 OID 42675)
-- Name: ecom_products ecom_products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_slug_key UNIQUE (slug);


--
-- TOC entry 4552 (class 2606 OID 42686)
-- Name: ecom_wishlist ecom_wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_wishlist
    ADD CONSTRAINT ecom_wishlist_pkey PRIMARY KEY (user_id, product_id);


--
-- TOC entry 4577 (class 2606 OID 42915)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4573 (class 2606 OID 42900)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4589 (class 2606 OID 43056)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4682 (class 2606 OID 58822)
-- Name: product_catalog product_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_catalog
    ADD CONSTRAINT product_catalog_pkey PRIMARY KEY (product_uid);


--
-- TOC entry 4684 (class 2606 OID 58824)
-- Name: product_catalog product_catalog_source_schema_source_table_source_pk_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_catalog
    ADD CONSTRAINT product_catalog_source_schema_source_table_source_pk_key UNIQUE (source_schema, source_table, source_pk);


--
-- TOC entry 4693 (class 2606 OID 58849)
-- Name: product_rating_stats product_rating_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_rating_stats
    ADD CONSTRAINT product_rating_stats_pkey PRIMARY KEY (product_uid);


--
-- TOC entry 4673 (class 2606 OID 56381)
-- Name: product_reviews_raw product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (product_id, user_id);


--
-- TOC entry 4556 (class 2606 OID 42803)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4696 (class 2606 OID 58863)
-- Name: review_rate_limits review_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_rate_limits
    ADD CONSTRAINT review_rate_limits_pkey PRIMARY KEY (ip_hash);


--
-- TOC entry 4598 (class 2606 OID 43175)
-- Name: reviews__backup_20250909_181553 reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4676 (class 2606 OID 57167)
-- Name: reviews reviews_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey1 PRIMARY KEY (product_id, user_id);


--
-- TOC entry 4600 (class 2606 OID 43177)
-- Name: reviews__backup_20250909_181553 reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- TOC entry 4690 (class 2606 OID 58835)
-- Name: reviews_unified reviews_unified_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews_unified
    ADD CONSTRAINT reviews_unified_pkey PRIMARY KEY (id);


--
-- TOC entry 4678 (class 2606 OID 57429)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- TOC entry 4584 (class 2606 OID 43017)
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- TOC entry 4522 (class 2606 OID 17269)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4519 (class 2606 OID 17117)
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- TOC entry 4511 (class 2606 OID 17007)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4605 (class 2606 OID 45557)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4607 (class 2606 OID 45559)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 4632 (class 2606 OID 45719)
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- TOC entry 4634 (class 2606 OID 45717)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 4639 (class 2606 OID 45750)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4636 (class 2606 OID 45735)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4619 (class 2606 OID 45589)
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4609 (class 2606 OID 45572)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4611 (class 2606 OID 51445)
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- TOC entry 4629 (class 2606 OID 45685)
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- TOC entry 4642 (class 2606 OID 45798)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4626 (class 2606 OID 45640)
-- Name: stock stock_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.stock
    ADD CONSTRAINT stock_pkey PRIMARY KEY (variant_id);


--
-- TOC entry 4622 (class 2606 OID 45625)
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- TOC entry 4624 (class 2606 OID 45627)
-- Name: variants variants_sku_key; Type: CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.variants
    ADD CONSTRAINT variants_sku_key UNIQUE (sku);


--
-- TOC entry 4527 (class 2606 OID 21252)
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4440 (class 2606 OID 16554)
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- TOC entry 4450 (class 2606 OID 16595)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 4452 (class 2606 OID 16593)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4448 (class 2606 OID 16571)
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- TOC entry 4525 (class 2606 OID 21206)
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- TOC entry 4516 (class 2606 OID 17063)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 4514 (class 2606 OID 17048)
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- TOC entry 4535 (class 2606 OID 34541)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4537 (class 2606 OID 34548)
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- TOC entry 4667 (class 2606 OID 50835)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4665 (class 2606 OID 50822)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- TOC entry 4669 (class 2606 OID 50859)
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4656 (class 1259 OID 46236)
-- Name: aff_events_by_type_time; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX aff_events_by_type_time ON aff.events USING btree (event_ts) WHERE (event_type = 'click'::aff.event_type);


--
-- TOC entry 4657 (class 1259 OID 46070)
-- Name: aff_events_clicks_offer_time; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX aff_events_clicks_offer_time ON aff.events USING btree (offer_id, event_ts) WHERE (event_type = 'click'::aff.event_type);


--
-- TOC entry 4658 (class 1259 OID 46214)
-- Name: aff_events_clicks_time; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX aff_events_clicks_time ON aff.events USING btree (event_ts) WHERE (event_type = 'click'::aff.event_type);


--
-- TOC entry 4659 (class 1259 OID 46192)
-- Name: aff_events_event_ts_brin; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX aff_events_event_ts_brin ON aff.events USING brin (event_ts) WITH (pages_per_range='32');


--
-- TOC entry 4660 (class 1259 OID 45913)
-- Name: events_event_type_event_ts_idx; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX events_event_type_event_ts_idx ON aff.events USING btree (event_type, event_ts);


--
-- TOC entry 4661 (class 1259 OID 45912)
-- Name: events_offer_id_event_ts_idx; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX events_offer_id_event_ts_idx ON aff.events USING btree (offer_id, event_ts);


--
-- TOC entry 4651 (class 1259 OID 45867)
-- Name: offers_lower_idx; Type: INDEX; Schema: aff; Owner: postgres
--

CREATE INDEX offers_lower_idx ON aff.offers USING btree (lower(license));


--
-- TOC entry 4435 (class 1259 OID 16532)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 4409 (class 1259 OID 16748)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4410 (class 1259 OID 16750)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4411 (class 1259 OID 16751)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4467 (class 1259 OID 16829)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 4500 (class 1259 OID 16937)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 4456 (class 1259 OID 16917)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 4456
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 4461 (class 1259 OID 16745)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 4503 (class 1259 OID 16934)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4504 (class 1259 OID 16935)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 4475 (class 1259 OID 16940)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 4472 (class 1259 OID 16801)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 4473 (class 1259 OID 16946)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 4528 (class 1259 OID 33371)
-- Name: oauth_clients_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);


--
-- TOC entry 4531 (class 1259 OID 33372)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4507 (class 1259 OID 16993)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 4508 (class 1259 OID 16992)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 4509 (class 1259 OID 16994)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 4412 (class 1259 OID 16752)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4413 (class 1259 OID 16749)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4422 (class 1259 OID 16515)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 4423 (class 1259 OID 16516)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 4424 (class 1259 OID 16744)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 4427 (class 1259 OID 16831)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 4430 (class 1259 OID 16936)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 4494 (class 1259 OID 16873)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 4495 (class 1259 OID 16938)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 4496 (class 1259 OID 16888)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 4499 (class 1259 OID 16887)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 4462 (class 1259 OID 16939)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 4465 (class 1259 OID 16830)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 4486 (class 1259 OID 16855)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 4489 (class 1259 OID 16854)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 4484 (class 1259 OID 16840)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 4485 (class 1259 OID 17002)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 4474 (class 1259 OID 16999)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 4466 (class 1259 OID 16828)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 4414 (class 1259 OID 16908)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 4414
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 4415 (class 1259 OID 16746)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 4416 (class 1259 OID 16505)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 4417 (class 1259 OID 16963)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4601 (class 1259 OID 43220)
-- Name: audit_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_created_idx ON public.audit_log USING btree (created_at DESC);


--
-- TOC entry 4561 (class 1259 OID 42862)
-- Name: cart_items_cart_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cart_items_cart_idx ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4564 (class 1259 OID 42863)
-- Name: cart_items_unique_no_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cart_items_unique_no_variant ON public.cart_items USING btree (cart_id, product_id) WHERE (variant_id IS NULL);


--
-- TOC entry 4565 (class 1259 OID 42864)
-- Name: cart_items_unique_with_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cart_items_unique_with_variant ON public.cart_items USING btree (cart_id, product_id, variant_id) WHERE (variant_id IS NOT NULL);


--
-- TOC entry 4542 (class 1259 OID 42692)
-- Name: ecom_products_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ecom_products_category_idx ON public.ecom_products USING btree (category_slug);


--
-- TOC entry 4545 (class 1259 OID 42693)
-- Name: ecom_products_price_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ecom_products_price_idx ON public.ecom_products USING btree (price);


--
-- TOC entry 4546 (class 1259 OID 42694)
-- Name: ecom_products_rating_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ecom_products_rating_idx ON public.ecom_products USING btree (rating);


--
-- TOC entry 4549 (class 1259 OID 58650)
-- Name: ecom_products_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ecom_products_status_idx ON public.ecom_products USING btree (status);


--
-- TOC entry 4550 (class 1259 OID 42695)
-- Name: ecom_products_title_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ecom_products_title_gin ON public.ecom_products USING gin (to_tsvector('simple'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(short_desc, ''::text))));


--
-- TOC entry 4582 (class 1259 OID 65770)
-- Name: idx_addresses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_user_id ON public.addresses USING btree (user_id);


--
-- TOC entry 4566 (class 1259 OID 64870)
-- Name: idx_cart_items_cart_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_cart_items_cart_product ON public.cart_items USING btree (cart_id, product_id);


--
-- TOC entry 4559 (class 1259 OID 65775)
-- Name: idx_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 4595 (class 1259 OID 65780)
-- Name: idx_coupon_redemptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coupon_redemptions_user_id ON public.coupon_redemptions USING btree (user_id);


--
-- TOC entry 4553 (class 1259 OID 65785)
-- Name: idx_ecom_wishlist_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ecom_wishlist_user_id ON public.ecom_wishlist USING btree (user_id);


--
-- TOC entry 4570 (class 1259 OID 65790)
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 4679 (class 1259 OID 58825)
-- Name: idx_product_catalog_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_catalog_source ON public.product_catalog USING btree (source_schema, source_table, source_pk);


--
-- TOC entry 4671 (class 1259 OID 65795)
-- Name: idx_product_reviews_raw_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_reviews_raw_user_id ON public.product_reviews_raw USING btree (user_id);


--
-- TOC entry 4554 (class 1259 OID 65800)
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- TOC entry 4596 (class 1259 OID 65810)
-- Name: idx_reviews__backup_20250909_181553_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews__backup_20250909_181553_user_id ON public.reviews__backup_20250909_181553 USING btree (user_id);


--
-- TOC entry 4685 (class 1259 OID 58841)
-- Name: idx_reviews_unified_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_unified_product ON public.reviews_unified USING btree (product_uid);


--
-- TOC entry 4686 (class 1259 OID 65815)
-- Name: idx_reviews_unified_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_unified_user_id ON public.reviews_unified USING btree (user_id);


--
-- TOC entry 4674 (class 1259 OID 65805)
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- TOC entry 4567 (class 1259 OID 62635)
-- Name: ix_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4560 (class 1259 OID 62636)
-- Name: ix_carts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_carts_user_id ON public.carts USING btree (user_id);


--
-- TOC entry 4574 (class 1259 OID 62633)
-- Name: ix_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 4571 (class 1259 OID 62632)
-- Name: ix_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 4585 (class 1259 OID 62634)
-- Name: ix_payments_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 4586 (class 1259 OID 63854)
-- Name: ix_payments_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_status_created ON public.payments USING btree (status, created_at DESC);


--
-- TOC entry 4680 (class 1259 OID 59516)
-- Name: ix_product_catalog_triplet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_catalog_triplet ON public.product_catalog USING btree (source_schema, source_table, source_pk);


--
-- TOC entry 4694 (class 1259 OID 62100)
-- Name: ix_review_rate_limits_iphash_lastat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_review_rate_limits_iphash_lastat ON public.review_rate_limits USING btree (ip_hash, last_at DESC);


--
-- TOC entry 4687 (class 1259 OID 59515)
-- Name: ix_reviews_unified_product_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_reviews_unified_product_created ON public.reviews_unified USING btree (product_uid, created_at DESC);


--
-- TOC entry 4688 (class 1259 OID 59514)
-- Name: ix_reviews_unified_product_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_reviews_unified_product_status ON public.reviews_unified USING btree (product_uid, status);


--
-- TOC entry 4575 (class 1259 OID 42926)
-- Name: order_items_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);


--
-- TOC entry 4578 (class 1259 OID 42927)
-- Name: order_items_unique_no_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_items_unique_no_variant ON public.order_items USING btree (order_id, product_id) WHERE (variant_id IS NULL);


--
-- TOC entry 4579 (class 1259 OID 42928)
-- Name: order_items_unique_with_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_items_unique_with_variant ON public.order_items USING btree (order_id, product_id, variant_id) WHERE (variant_id IS NOT NULL);


--
-- TOC entry 4587 (class 1259 OID 43062)
-- Name: payments_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_order_idx ON public.payments USING btree (order_id);


--
-- TOC entry 4568 (class 1259 OID 64032)
-- Name: ux_cart_items_no_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_cart_items_no_variant ON public.cart_items USING btree (cart_id, product_id) WHERE (variant_id IS NULL);


--
-- TOC entry 4569 (class 1259 OID 64033)
-- Name: ux_cart_items_with_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_cart_items_with_variant ON public.cart_items USING btree (cart_id, product_id, variant_id) WHERE (variant_id IS NOT NULL);


--
-- TOC entry 4590 (class 1259 OID 63812)
-- Name: ux_payments_order_succeeded; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_payments_order_succeeded ON public.payments USING btree (order_id) WHERE (status = 'succeeded'::public.payment_status);


--
-- TOC entry 4691 (class 1259 OID 59312)
-- Name: ux_reviews_unified_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_reviews_unified_active ON public.reviews_unified USING btree (product_uid, user_id) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));


--
-- TOC entry 4517 (class 1259 OID 17270)
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- TOC entry 4520 (class 1259 OID 17170)
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- TOC entry 4637 (class 1259 OID 45766)
-- Name: order_items_order_id_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX order_items_order_id_idx ON shop.order_items USING btree (order_id);


--
-- TOC entry 4620 (class 1259 OID 45595)
-- Name: product_images_product_id_sort_order_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX product_images_product_id_sort_order_idx ON shop.product_images USING btree (product_id, sort_order);


--
-- TOC entry 4670 (class 1259 OID 52033)
-- Name: product_ratings_new_pk; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE UNIQUE INDEX product_ratings_new_pk ON shop.product_ratings USING btree (product_id);


--
-- TOC entry 4627 (class 1259 OID 45686)
-- Name: promotions_lower_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX promotions_lower_idx ON shop.promotions USING btree (lower(coupon_code));


--
-- TOC entry 4643 (class 1259 OID 45804)
-- Name: reviews_product_id_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX reviews_product_id_idx ON shop.reviews USING btree (product_id);


--
-- TOC entry 4640 (class 1259 OID 50844)
-- Name: shop_order_items_order_id; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_order_items_order_id ON shop.order_items USING btree (order_id);


--
-- TOC entry 4612 (class 1259 OID 53578)
-- Name: shop_products_active_cat_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_products_active_cat_idx ON shop.products USING btree (is_active, category_id);


--
-- TOC entry 4613 (class 1259 OID 50164)
-- Name: shop_products_search_gin; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_products_search_gin ON shop.products USING gin (search);


--
-- TOC entry 4614 (class 1259 OID 50837)
-- Name: shop_products_title_trgm; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_products_title_trgm ON shop.products USING gin (title extensions.gin_trgm_ops);


--
-- TOC entry 4630 (class 1259 OID 50845)
-- Name: shop_promotions_coupon; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_promotions_coupon ON shop.promotions USING btree (lower(coupon_code));


--
-- TOC entry 4644 (class 1259 OID 53580)
-- Name: shop_reviews_product_created_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_reviews_product_created_idx ON shop.reviews USING btree (product_id, created_at DESC);


--
-- TOC entry 4645 (class 1259 OID 50840)
-- Name: shop_reviews_product_id; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_reviews_product_id ON shop.reviews USING btree (product_id);


--
-- TOC entry 4646 (class 1259 OID 53579)
-- Name: shop_reviews_product_status_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_reviews_product_status_idx ON shop.reviews USING btree (product_id, status);


--
-- TOC entry 4647 (class 1259 OID 52906)
-- Name: shop_reviews_status_idx; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE INDEX shop_reviews_status_idx ON shop.reviews USING btree (status);


--
-- TOC entry 4615 (class 1259 OID 51350)
-- Name: uq_products_cat_title; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE UNIQUE INDEX uq_products_cat_title ON shop.products USING btree (category_id, lower(title));


--
-- TOC entry 4616 (class 1259 OID 51446)
-- Name: uq_products_sku; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE UNIQUE INDEX uq_products_sku ON shop.products USING btree (sku);


--
-- TOC entry 4617 (class 1259 OID 51223)
-- Name: uq_products_slug; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE UNIQUE INDEX uq_products_slug ON shop.products USING btree (slug);


--
-- TOC entry 4648 (class 1259 OID 51812)
-- Name: uq_reviews_product_user; Type: INDEX; Schema: shop; Owner: postgres
--

CREATE UNIQUE INDEX uq_reviews_product_user ON shop.reviews USING btree (product_id, user_id);


--
-- TOC entry 4438 (class 1259 OID 16560)
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- TOC entry 4441 (class 1259 OID 16582)
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- TOC entry 4512 (class 1259 OID 17074)
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- TOC entry 4442 (class 1259 OID 21224)
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- TOC entry 4443 (class 1259 OID 17039)
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- TOC entry 4444 (class 1259 OID 21226)
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- TOC entry 4523 (class 1259 OID 21227)
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- TOC entry 4445 (class 1259 OID 16583)
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- TOC entry 4446 (class 1259 OID 21225)
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- TOC entry 4755 (class 2620 OID 67390)
-- Name: order_items trg_order_items_recalc; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_order_items_recalc AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_after_order_items();


--
-- TOC entry 4756 (class 2620 OID 63791)
-- Name: payments trg_payments_status_propagate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_payments_status_propagate AFTER UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tr_payments_status_propagate();


--
-- TOC entry 4764 (class 2620 OID 56401)
-- Name: product_reviews_raw trg_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews_raw FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4767 (class 2620 OID 58866)
-- Name: reviews_unified trg_reviews_unified_recalc; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reviews_unified_recalc AFTER INSERT OR DELETE OR UPDATE ON public.reviews_unified FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_after_review_unified();


--
-- TOC entry 4765 (class 2620 OID 57188)
-- Name: reviews trg_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4766 (class 2620 OID 57454)
-- Name: settings trg_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_settings_updated_at();


--
-- TOC entry 4752 (class 2620 OID 17122)
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- TOC entry 4757 (class 2620 OID 50923)
-- Name: products _audit_products; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER _audit_products AFTER INSERT OR DELETE OR UPDATE ON shop.products FOR EACH ROW EXECUTE FUNCTION sys.audit_trigger();


--
-- TOC entry 4760 (class 2620 OID 53031)
-- Name: reviews _ratings_refresh; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER _ratings_refresh AFTER INSERT OR DELETE OR UPDATE ON shop.reviews FOR EACH STATEMENT EXECUTE FUNCTION shop.refresh_product_ratings();


--
-- TOC entry 4759 (class 2620 OID 50921)
-- Name: stock _stock_touch; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER _stock_touch BEFORE UPDATE ON shop.stock FOR EACH ROW EXECUTE FUNCTION shop.stock_touch();


--
-- TOC entry 4758 (class 2620 OID 51447)
-- Name: products trg_products_autosku_ins; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER trg_products_autosku_ins BEFORE INSERT ON shop.products FOR EACH ROW EXECUTE FUNCTION shop.products_autosku();


--
-- TOC entry 4761 (class 2620 OID 52142)
-- Name: reviews trg_reviews_rate_limit; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER trg_reviews_rate_limit BEFORE INSERT OR UPDATE ON shop.reviews FOR EACH ROW EXECUTE FUNCTION shop.rate_limit_review();


--
-- TOC entry 4762 (class 2620 OID 51816)
-- Name: reviews trg_reviews_sanitize; Type: TRIGGER; Schema: shop; Owner: postgres
--

CREATE TRIGGER trg_reviews_sanitize BEFORE INSERT OR UPDATE ON shop.reviews FOR EACH ROW EXECUTE FUNCTION shop.reviews_sanitize_rating();


--
-- TOC entry 4747 (class 2620 OID 21234)
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- TOC entry 4748 (class 2620 OID 21222)
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- TOC entry 4749 (class 2620 OID 21220)
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- TOC entry 4750 (class 2620 OID 21221)
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- TOC entry 4753 (class 2620 OID 21230)
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- TOC entry 4754 (class 2620 OID 21219)
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- TOC entry 4751 (class 2620 OID 17027)
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- TOC entry 4763 (class 2620 OID 50920)
-- Name: settings _settings_touch; Type: TRIGGER; Schema: sys; Owner: postgres
--

CREATE TRIGGER _settings_touch BEFORE UPDATE ON sys.settings FOR EACH ROW EXECUTE FUNCTION sys.touch_updated_at();


--
-- TOC entry 4742 (class 2606 OID 45907)
-- Name: events events_offer_id_fkey; Type: FK CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.events
    ADD CONSTRAINT events_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES aff.offers(id) ON DELETE CASCADE;


--
-- TOC entry 4741 (class 2606 OID 45862)
-- Name: offers offers_source_id_fkey; Type: FK CONSTRAINT; Schema: aff; Owner: postgres
--

ALTER TABLE ONLY aff.offers
    ADD CONSTRAINT offers_source_id_fkey FOREIGN KEY (source_id) REFERENCES aff.sources(id) ON DELETE SET NULL;


--
-- TOC entry 4699 (class 2606 OID 16732)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4703 (class 2606 OID 16821)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4702 (class 2606 OID 16809)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4701 (class 2606 OID 16796)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4708 (class 2606 OID 16987)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4697 (class 2606 OID 16765)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4705 (class 2606 OID 16868)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4706 (class 2606 OID 16941)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4707 (class 2606 OID 16882)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4700 (class 2606 OID 16760)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4704 (class 2606 OID 16849)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4723 (class 2606 OID 42982)
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4717 (class 2606 OID 42852)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 4718 (class 2606 OID 42857)
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- TOC entry 4716 (class 2606 OID 42839)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4727 (class 2606 OID 43130)
-- Name: coupon_redemptions coupon_redemptions_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_code_fkey FOREIGN KEY (code) REFERENCES public.coupons(code) ON DELETE CASCADE;


--
-- TOC entry 4728 (class 2606 OID 43140)
-- Name: coupon_redemptions coupon_redemptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- TOC entry 4729 (class 2606 OID 43135)
-- Name: coupon_redemptions coupon_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4713 (class 2606 OID 42676)
-- Name: ecom_products ecom_products_category_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_category_slug_fkey FOREIGN KEY (category_slug) REFERENCES public.ecom_categories(slug) ON DELETE SET NULL;


--
-- TOC entry 4714 (class 2606 OID 42687)
-- Name: ecom_wishlist ecom_wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ecom_wishlist
    ADD CONSTRAINT ecom_wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- TOC entry 4720 (class 2606 OID 64258)
-- Name: order_items fk_order_items_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4725 (class 2606 OID 64263)
-- Name: payments fk_payments_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4721 (class 2606 OID 42916)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4722 (class 2606 OID 42921)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id);


--
-- TOC entry 4719 (class 2606 OID 42901)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4726 (class 2606 OID 43057)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4746 (class 2606 OID 58850)
-- Name: product_rating_stats product_rating_stats_product_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_rating_stats
    ADD CONSTRAINT product_rating_stats_product_uid_fkey FOREIGN KEY (product_uid) REFERENCES public.product_catalog(product_uid) ON DELETE CASCADE;


--
-- TOC entry 4743 (class 2606 OID 56382)
-- Name: product_reviews_raw product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- TOC entry 4744 (class 2606 OID 56387)
-- Name: product_reviews_raw product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4715 (class 2606 OID 42804)
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4730 (class 2606 OID 43178)
-- Name: reviews__backup_20250909_181553 reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- TOC entry 4745 (class 2606 OID 58836)
-- Name: reviews_unified reviews_unified_product_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews_unified
    ADD CONSTRAINT reviews_unified_product_uid_fkey FOREIGN KEY (product_uid) REFERENCES public.product_catalog(product_uid) ON DELETE CASCADE;


--
-- TOC entry 4731 (class 2606 OID 43183)
-- Name: reviews__backup_20250909_181553 reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4724 (class 2606 OID 43018)
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4737 (class 2606 OID 45751)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES shop.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4738 (class 2606 OID 45756)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop.products(id);


--
-- TOC entry 4739 (class 2606 OID 45761)
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES shop.variants(id);


--
-- TOC entry 4736 (class 2606 OID 45736)
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop.customers(id);


--
-- TOC entry 4733 (class 2606 OID 45590)
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE;


--
-- TOC entry 4732 (class 2606 OID 45575)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES shop.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4740 (class 2606 OID 45799)
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE;


--
-- TOC entry 4735 (class 2606 OID 45641)
-- Name: stock stock_variant_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.stock
    ADD CONSTRAINT stock_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES shop.variants(id) ON DELETE CASCADE;


--
-- TOC entry 4734 (class 2606 OID 45628)
-- Name: variants variants_product_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: postgres
--

ALTER TABLE ONLY shop.variants
    ADD CONSTRAINT variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop.products(id) ON DELETE CASCADE;


--
-- TOC entry 4698 (class 2606 OID 16572)
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4712 (class 2606 OID 21207)
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4709 (class 2606 OID 17049)
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4710 (class 2606 OID 17069)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4711 (class 2606 OID 17064)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- TOC entry 4972 (class 0 OID 45898)
-- Dependencies: 436
-- Name: events; Type: ROW SECURITY; Schema: aff; Owner: postgres
--

ALTER TABLE aff.events ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5008 (class 3256 OID 45964)
-- Name: events events_insert_via_anon; Type: POLICY; Schema: aff; Owner: postgres
--

CREATE POLICY events_insert_via_anon ON aff.events FOR INSERT TO anon WITH CHECK (true);


--
-- TOC entry 4932 (class 0 OID 16525)
-- Dependencies: 363
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4946 (class 0 OID 16927)
-- Dependencies: 380
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4937 (class 0 OID 16725)
-- Dependencies: 371
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4931 (class 0 OID 16518)
-- Dependencies: 362
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4941 (class 0 OID 16814)
-- Dependencies: 375
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4940 (class 0 OID 16802)
-- Dependencies: 374
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4939 (class 0 OID 16789)
-- Dependencies: 373
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4947 (class 0 OID 16977)
-- Dependencies: 381
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4930 (class 0 OID 16507)
-- Dependencies: 361
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4944 (class 0 OID 16856)
-- Dependencies: 378
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4945 (class 0 OID 16874)
-- Dependencies: 379
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4933 (class 0 OID 16533)
-- Dependencies: 364
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4938 (class 0 OID 16755)
-- Dependencies: 372
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4943 (class 0 OID 16841)
-- Dependencies: 377
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4942 (class 0 OID 16832)
-- Dependencies: 376
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4929 (class 0 OID 16495)
-- Dependencies: 359
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4961 (class 0 OID 42970)
-- Dependencies: 405
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5004 (class 3256 OID 66063)
-- Name: addresses addresses_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_delete ON public.addresses FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4985 (class 3256 OID 66061)
-- Name: addresses addresses_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_insert ON public.addresses FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4989 (class 3256 OID 42987)
-- Name: addresses addresses_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_owner ON public.addresses USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4984 (class 3256 OID 66060)
-- Name: addresses addresses_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_select ON public.addresses FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5003 (class 3256 OID 66062)
-- Name: addresses addresses_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_update ON public.addresses FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4967 (class 0 OID 43211)
-- Dependencies: 412
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5022 (class 3256 OID 43258)
-- Name: audit_log audit_srv_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_srv_all ON public.audit_log USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4997 (class 3256 OID 57456)
-- Name: settings auth write settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "auth write settings" ON public.settings TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 4958 (class 0 OID 42844)
-- Dependencies: 402
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5009 (class 3256 OID 43243)
-- Name: cart_items cart_items_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cart_items_owner_all ON public.cart_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = auth.uid())))));


--
-- TOC entry 5077 (class 3256 OID 62631)
-- Name: cart_items cart_items_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cart_items_srv_write ON public.cart_items TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4957 (class 0 OID 42832)
-- Dependencies: 401
-- Name: carts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5011 (class 3256 OID 66067)
-- Name: carts carts_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY carts_delete ON public.carts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5006 (class 3256 OID 66065)
-- Name: carts carts_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY carts_insert ON public.carts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5002 (class 3256 OID 43242)
-- Name: carts carts_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY carts_owner_all ON public.carts USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5005 (class 3256 OID 66064)
-- Name: carts carts_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY carts_select ON public.carts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5010 (class 3256 OID 66066)
-- Name: carts carts_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY carts_update ON public.carts FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4965 (class 0 OID 43122)
-- Dependencies: 409
-- Name: coupon_redemptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5023 (class 3256 OID 66071)
-- Name: coupon_redemptions coupon_redemptions_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_delete ON public.coupon_redemptions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5015 (class 3256 OID 66069)
-- Name: coupon_redemptions coupon_redemptions_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_insert ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5021 (class 3256 OID 43257)
-- Name: coupon_redemptions coupon_redemptions_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_owner_insert ON public.coupon_redemptions FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));


--
-- TOC entry 5020 (class 3256 OID 43256)
-- Name: coupon_redemptions coupon_redemptions_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_owner_read ON public.coupon_redemptions FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 5012 (class 3256 OID 66068)
-- Name: coupon_redemptions coupon_redemptions_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_select ON public.coupon_redemptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5018 (class 3256 OID 66070)
-- Name: coupon_redemptions coupon_redemptions_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupon_redemptions_update ON public.coupon_redemptions FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4964 (class 0 OID 43112)
-- Dependencies: 408
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5016 (class 3256 OID 43254)
-- Name: coupons coupons_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupons_public_read ON public.coupons FOR SELECT USING (((active = true) AND ((valid_from IS NULL) OR (now() >= valid_from)) AND ((valid_to IS NULL) OR (now() <= valid_to))));


--
-- TOC entry 5019 (class 3256 OID 43255)
-- Name: coupons coupons_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY coupons_srv_write ON public.coupons USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4953 (class 0 OID 42650)
-- Dependencies: 397
-- Name: ecom_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ecom_categories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5067 (class 3256 OID 58625)
-- Name: ecom_categories ecom_categories_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_categories_admin_write ON public.ecom_categories TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- TOC entry 4993 (class 3256 OID 42696)
-- Name: ecom_categories ecom_categories_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_categories_public_read ON public.ecom_categories FOR SELECT USING (true);


--
-- TOC entry 4954 (class 0 OID 42661)
-- Dependencies: 398
-- Name: ecom_products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ecom_products ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5068 (class 3256 OID 58626)
-- Name: ecom_products ecom_products_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_products_admin_write ON public.ecom_products TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- TOC entry 4994 (class 3256 OID 42697)
-- Name: ecom_products ecom_products_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_products_public_read ON public.ecom_products FOR SELECT USING (true);


--
-- TOC entry 4955 (class 0 OID 42681)
-- Dependencies: 399
-- Name: ecom_wishlist; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ecom_wishlist ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5027 (class 3256 OID 66075)
-- Name: ecom_wishlist ecom_wishlist_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_delete ON public.ecom_wishlist FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5025 (class 3256 OID 66073)
-- Name: ecom_wishlist ecom_wishlist_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_insert ON public.ecom_wishlist FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5066 (class 3256 OID 57480)
-- Name: ecom_wishlist ecom_wishlist_owner_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_owner_delete ON public.ecom_wishlist FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 5065 (class 3256 OID 57479)
-- Name: ecom_wishlist ecom_wishlist_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_owner_insert ON public.ecom_wishlist FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5064 (class 3256 OID 57478)
-- Name: ecom_wishlist ecom_wishlist_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_owner_read ON public.ecom_wishlist FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 5024 (class 3256 OID 66072)
-- Name: ecom_wishlist ecom_wishlist_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_select ON public.ecom_wishlist FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5026 (class 3256 OID 66074)
-- Name: ecom_wishlist ecom_wishlist_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ecom_wishlist_update ON public.ecom_wishlist FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4982 (class 0 OID 63605)
-- Dependencies: 461
-- Name: line_total_is_generated; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.line_total_is_generated ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4960 (class 0 OID 42906)
-- Dependencies: 404
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5074 (class 3256 OID 43248)
-- Name: order_items order_items_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY order_items_owner_read ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- TOC entry 5075 (class 3256 OID 62628)
-- Name: order_items order_items_owner_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY order_items_owner_write ON public.order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- TOC entry 5073 (class 3256 OID 43249)
-- Name: order_items order_items_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY order_items_srv_write ON public.order_items TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4959 (class 0 OID 42886)
-- Dependencies: 403
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5031 (class 3256 OID 66079)
-- Name: orders orders_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5029 (class 3256 OID 66077)
-- Name: orders orders_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5071 (class 3256 OID 43246)
-- Name: orders orders_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_owner_insert ON public.orders FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5070 (class 3256 OID 43245)
-- Name: orders orders_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_owner_read ON public.orders FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5028 (class 3256 OID 66076)
-- Name: orders orders_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5072 (class 3256 OID 62468)
-- Name: orders orders_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_srv_write ON public.orders TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 5030 (class 3256 OID 66078)
-- Name: orders orders_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4963 (class 0 OID 43046)
-- Dependencies: 407
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5076 (class 3256 OID 43252)
-- Name: payments payments_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payments_owner_read ON public.payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = auth.uid())))));


--
-- TOC entry 5017 (class 3256 OID 43253)
-- Name: payments payments_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payments_srv_write ON public.payments TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4977 (class 0 OID 58814)
-- Dependencies: 452
-- Name: product_catalog; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4979 (class 0 OID 58842)
-- Dependencies: 454
-- Name: product_rating_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_rating_stats ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5059 (class 3256 OID 56403)
-- Name: product_reviews_raw product_reviews_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_owner_insert ON public.product_reviews_raw FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5060 (class 3256 OID 56404)
-- Name: product_reviews_raw product_reviews_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_owner_update ON public.product_reviews_raw FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5058 (class 3256 OID 56402)
-- Name: product_reviews_raw product_reviews_public_read_approved; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_public_read_approved ON public.product_reviews_raw FOR SELECT USING ((status = 'approved'::text));


--
-- TOC entry 4974 (class 0 OID 56370)
-- Dependencies: 448
-- Name: product_reviews_raw; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_reviews_raw ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5035 (class 3256 OID 66083)
-- Name: product_reviews_raw product_reviews_raw_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_raw_delete ON public.product_reviews_raw FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5033 (class 3256 OID 66081)
-- Name: product_reviews_raw product_reviews_raw_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_raw_insert ON public.product_reviews_raw FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5032 (class 3256 OID 66080)
-- Name: product_reviews_raw product_reviews_raw_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_raw_select ON public.product_reviews_raw FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5034 (class 3256 OID 66082)
-- Name: product_reviews_raw product_reviews_raw_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_reviews_raw_update ON public.product_reviews_raw FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4956 (class 0 OID 42796)
-- Dependencies: 400
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5039 (class 3256 OID 66087)
-- Name: profiles profiles_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5037 (class 3256 OID 66085)
-- Name: profiles profiles_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5036 (class 3256 OID 66084)
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4986 (class 3256 OID 42809)
-- Name: profiles profiles_self_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4988 (class 3256 OID 42811)
-- Name: profiles profiles_self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 4987 (class 3256 OID 42810)
-- Name: profiles profiles_self_upsert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_self_upsert ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5038 (class 3256 OID 66086)
-- Name: profiles profiles_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4996 (class 3256 OID 57455)
-- Name: settings public read settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read settings" ON public.settings FOR SELECT TO anon USING (true);


--
-- TOC entry 4999 (class 3256 OID 58870)
-- Name: product_catalog read catalog; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read catalog" ON public.product_catalog FOR SELECT USING (true);


--
-- TOC entry 4998 (class 3256 OID 58868)
-- Name: product_rating_stats read stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read stats" ON public.product_rating_stats FOR SELECT USING (true);


--
-- TOC entry 4980 (class 0 OID 58855)
-- Dependencies: 455
-- Name: review_rate_limits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.review_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4975 (class 0 OID 57156)
-- Dependencies: 449
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4966 (class 0 OID 43166)
-- Dependencies: 410
-- Name: reviews__backup_20250909_181553; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews__backup_20250909_181553 ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5047 (class 3256 OID 66095)
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews__backup_20250909_181553_delete ON public.reviews__backup_20250909_181553 FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5045 (class 3256 OID 66093)
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews__backup_20250909_181553_insert ON public.reviews__backup_20250909_181553 FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5044 (class 3256 OID 66092)
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews__backup_20250909_181553_select ON public.reviews__backup_20250909_181553 FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5046 (class 3256 OID 66094)
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews__backup_20250909_181553_update ON public.reviews__backup_20250909_181553 FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5043 (class 3256 OID 66091)
-- Name: reviews reviews_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_delete ON public.reviews FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5041 (class 3256 OID 66089)
-- Name: reviews reviews_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5062 (class 3256 OID 57211)
-- Name: reviews reviews_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_owner_insert ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4990 (class 3256 OID 43188)
-- Name: reviews__backup_20250909_181553 reviews_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_owner_read ON public.reviews__backup_20250909_181553 FOR SELECT USING (true);


--
-- TOC entry 5063 (class 3256 OID 57212)
-- Name: reviews reviews_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_owner_update ON public.reviews FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5001 (class 3256 OID 43189)
-- Name: reviews__backup_20250909_181553 reviews_owner_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_owner_write ON public.reviews__backup_20250909_181553 USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5061 (class 3256 OID 57210)
-- Name: reviews reviews_public_read_approved; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_public_read_approved ON public.reviews FOR SELECT USING ((status = 'approved'::text));


--
-- TOC entry 5040 (class 3256 OID 66088)
-- Name: reviews reviews_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_select ON public.reviews FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4978 (class 0 OID 58826)
-- Dependencies: 453
-- Name: reviews_unified; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews_unified ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5051 (class 3256 OID 66099)
-- Name: reviews_unified reviews_unified_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_unified_delete ON public.reviews_unified FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5049 (class 3256 OID 66097)
-- Name: reviews_unified reviews_unified_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_unified_insert ON public.reviews_unified FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5048 (class 3256 OID 66096)
-- Name: reviews_unified reviews_unified_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_unified_select ON public.reviews_unified FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 5050 (class 3256 OID 66098)
-- Name: reviews_unified reviews_unified_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_unified_update ON public.reviews_unified FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5042 (class 3256 OID 66090)
-- Name: reviews reviews_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reviews_update ON public.reviews FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 5069 (class 3256 OID 62056)
-- Name: reviews_unified select approved only (public); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select approved only (public)" ON public.reviews_unified FOR SELECT USING ((status = 'approved'::text));


--
-- TOC entry 5000 (class 3256 OID 62078)
-- Name: product_rating_stats select prs public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select prs public" ON public.product_rating_stats FOR SELECT USING (true);


--
-- TOC entry 4976 (class 0 OID 57421)
-- Dependencies: 451
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4962 (class 0 OID 43008)
-- Dependencies: 406
-- Name: shipments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5013 (class 3256 OID 43250)
-- Name: shipments shipments_owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY shipments_owner_read ON public.shipments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = shipments.order_id) AND (o.user_id = auth.uid())))));


--
-- TOC entry 5014 (class 3256 OID 43251)
-- Name: shipments shipments_srv_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY shipments_srv_write ON public.shipments USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4981 (class 0 OID 63602)
-- Dependencies: 460
-- Name: total_is_generated; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.total_is_generated ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4950 (class 0 OID 17255)
-- Dependencies: 390
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4968 (class 0 OID 45549)
-- Dependencies: 414
-- Name: categories; Type: ROW SECURITY; Schema: shop; Owner: postgres
--

ALTER TABLE shop.categories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4970 (class 0 OID 45742)
-- Dependencies: 428
-- Name: order_items; Type: ROW SECURITY; Schema: shop; Owner: postgres
--

ALTER TABLE shop.order_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4969 (class 0 OID 45721)
-- Dependencies: 426
-- Name: orders; Type: ROW SECURITY; Schema: shop; Owner: postgres
--

ALTER TABLE shop.orders ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4991 (class 3256 OID 45941)
-- Name: orders orders_modify_owner; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY orders_modify_owner ON shop.orders TO authenticated USING ((auth.uid() = customer_id));


--
-- TOC entry 5007 (class 3256 OID 45940)
-- Name: orders orders_select_public; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY orders_select_public ON shop.orders FOR SELECT USING (true);


--
-- TOC entry 4971 (class 0 OID 45789)
-- Dependencies: 430
-- Name: reviews; Type: ROW SECURITY; Schema: shop; Owner: postgres
--

ALTER TABLE shop.reviews ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5052 (class 3256 OID 50925)
-- Name: orders shop_orders_modify_owner; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_orders_modify_owner ON shop.orders TO authenticated USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- TOC entry 4992 (class 3256 OID 50924)
-- Name: orders shop_orders_select_public; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_orders_select_public ON shop.orders FOR SELECT USING (true);


--
-- TOC entry 5056 (class 3256 OID 51841)
-- Name: reviews shop_reviews_delete_owner; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_reviews_delete_owner ON shop.reviews FOR DELETE TO authenticated USING (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- TOC entry 5054 (class 3256 OID 51839)
-- Name: reviews shop_reviews_insert_auth; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_reviews_insert_auth ON shop.reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 5057 (class 3256 OID 51842)
-- Name: reviews shop_reviews_moderate_admin; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_reviews_moderate_admin ON shop.reviews FOR UPDATE TO authenticated USING ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text)) WITH CHECK ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text));


--
-- TOC entry 4995 (class 3256 OID 51838)
-- Name: reviews shop_reviews_select_public; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_reviews_select_public ON shop.reviews FOR SELECT USING ((status = 'approved'::text));


--
-- TOC entry 5055 (class 3256 OID 51840)
-- Name: reviews shop_reviews_update_owner; Type: POLICY; Schema: shop; Owner: postgres
--

CREATE POLICY shop_reviews_update_owner ON shop.reviews FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = 'pending'::text))) WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- TOC entry 4934 (class 0 OID 16546)
-- Dependencies: 365
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4952 (class 0 OID 21242)
-- Dependencies: 392
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4936 (class 0 OID 16588)
-- Dependencies: 367
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4935 (class 0 OID 16561)
-- Dependencies: 366
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4951 (class 0 OID 21197)
-- Dependencies: 391
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5078 (class 3256 OID 64154)
-- Name: objects products_srv_write; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY products_srv_write ON storage.objects TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4983 (class 3256 OID 42738)
-- Name: objects public read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "public read" ON storage.objects FOR SELECT TO anon USING ((bucket_id = 'products'::text));


--
-- TOC entry 4948 (class 0 OID 17040)
-- Dependencies: 383
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4949 (class 0 OID 17054)
-- Dependencies: 384
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4973 (class 0 OID 50851)
-- Dependencies: 442
-- Name: webhook_logs; Type: ROW SECURITY; Schema: sys; Owner: postgres
--

ALTER TABLE sys.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5053 (class 3256 OID 50928)
-- Name: webhook_logs webhook_logs_admin_only; Type: POLICY; Schema: sys; Owner: postgres
--

CREATE POLICY webhook_logs_admin_only ON sys.webhook_logs FOR SELECT TO authenticated USING ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text));


--
-- TOC entry 5079 (class 6104 OID 16426)
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 142
-- Name: SCHEMA aff; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA aff TO ro_role;


--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 36
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 23
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 145
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO ro_role;


--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 12
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 131
-- Name: SCHEMA shop; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA shop TO anon;
GRANT USAGE ON SCHEMA shop TO authenticated;


--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 37
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 31
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 661
-- Name: FUNCTION citextin(cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citextin(cstring) TO postgres;
GRANT ALL ON FUNCTION extensions.citextin(cstring) TO anon;
GRANT ALL ON FUNCTION extensions.citextin(cstring) TO authenticated;
GRANT ALL ON FUNCTION extensions.citextin(cstring) TO service_role;


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 483
-- Name: FUNCTION citextout(extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citextout(extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citextout(extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citextout(extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citextout(extensions.citext) TO service_role;


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 541
-- Name: FUNCTION citextrecv(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citextrecv(internal) TO postgres;
GRANT ALL ON FUNCTION extensions.citextrecv(internal) TO anon;
GRANT ALL ON FUNCTION extensions.citextrecv(internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.citextrecv(internal) TO service_role;


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 734
-- Name: FUNCTION citextsend(extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citextsend(extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citextsend(extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citextsend(extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citextsend(extensions.citext) TO service_role;


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 486
-- Name: FUNCTION gtrgm_in(cstring); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_in(cstring) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_in(cstring) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_in(cstring) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_in(cstring) TO service_role;


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 678
-- Name: FUNCTION gtrgm_out(extensions.gtrgm); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_out(extensions.gtrgm) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_out(extensions.gtrgm) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_out(extensions.gtrgm) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_out(extensions.gtrgm) TO service_role;


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 576
-- Name: FUNCTION citext(boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext(boolean) TO postgres;
GRANT ALL ON FUNCTION extensions.citext(boolean) TO anon;
GRANT ALL ON FUNCTION extensions.citext(boolean) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext(boolean) TO service_role;


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 492
-- Name: FUNCTION citext(character); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext(character) TO postgres;
GRANT ALL ON FUNCTION extensions.citext(character) TO anon;
GRANT ALL ON FUNCTION extensions.citext(character) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext(character) TO service_role;


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 775
-- Name: FUNCTION citext(inet); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext(inet) TO postgres;
GRANT ALL ON FUNCTION extensions.citext(inet) TO anon;
GRANT ALL ON FUNCTION extensions.citext(inet) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext(inet) TO service_role;


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 735
-- Name: FUNCTION track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text); Type: ACL; Schema: aff; Owner: postgres
--

REVOKE ALL ON FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) FROM PUBLIC;
GRANT ALL ON FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) TO anon;
GRANT ALL ON FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) TO authenticated;


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 626
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 485
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 530
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 594
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 673
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 602
-- Name: FUNCTION citext_cmp(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_cmp(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_cmp(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_cmp(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_cmp(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 766
-- Name: FUNCTION citext_eq(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_eq(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_eq(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_eq(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_eq(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 622
-- Name: FUNCTION citext_ge(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_ge(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_ge(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_ge(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_ge(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 708
-- Name: FUNCTION citext_gt(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_gt(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_gt(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_gt(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_gt(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 732
-- Name: FUNCTION citext_hash(extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_hash(extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_hash(extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_hash(extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_hash(extensions.citext) TO service_role;


--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION citext_hash_extended(extensions.citext, bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_hash_extended(extensions.citext, bigint) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_hash_extended(extensions.citext, bigint) TO anon;
GRANT ALL ON FUNCTION extensions.citext_hash_extended(extensions.citext, bigint) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_hash_extended(extensions.citext, bigint) TO service_role;


--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 703
-- Name: FUNCTION citext_larger(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_larger(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_larger(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_larger(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_larger(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 718
-- Name: FUNCTION citext_le(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_le(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_le(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_le(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_le(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 660
-- Name: FUNCTION citext_lt(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_lt(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_lt(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_lt(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_lt(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 580
-- Name: FUNCTION citext_ne(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_ne(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_ne(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_ne(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_ne(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 704
-- Name: FUNCTION citext_pattern_cmp(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_pattern_cmp(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_pattern_cmp(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_pattern_cmp(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_pattern_cmp(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 710
-- Name: FUNCTION citext_pattern_ge(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_pattern_ge(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_pattern_ge(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_pattern_ge(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_pattern_ge(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 488
-- Name: FUNCTION citext_pattern_gt(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_pattern_gt(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_pattern_gt(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_pattern_gt(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_pattern_gt(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 603
-- Name: FUNCTION citext_pattern_le(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_pattern_le(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_pattern_le(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_pattern_le(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_pattern_le(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 722
-- Name: FUNCTION citext_pattern_lt(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_pattern_lt(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_pattern_lt(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_pattern_lt(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_pattern_lt(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 567
-- Name: FUNCTION citext_smaller(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.citext_smaller(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.citext_smaller(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.citext_smaller(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.citext_smaller(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5222 (class 0 OID 0)
-- Dependencies: 646
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 623
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 625
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 717
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 657
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 511
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 667
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 493
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 776
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 770
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 739
-- Name: FUNCTION gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal) TO service_role;


--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 672
-- Name: FUNCTION gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal) TO service_role;


--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 716
-- Name: FUNCTION gin_compare_prefix_bit(bit, bit, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bit(bit, bit, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bit(bit, bit, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bit(bit, bit, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bit(bit, bit, smallint, internal) TO service_role;


--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 476
-- Name: FUNCTION gin_compare_prefix_bool(boolean, boolean, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bool(boolean, boolean, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bool(boolean, boolean, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bool(boolean, boolean, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bool(boolean, boolean, smallint, internal) TO service_role;


--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 616
-- Name: FUNCTION gin_compare_prefix_bpchar(character, character, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bpchar(character, character, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bpchar(character, character, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bpchar(character, character, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bpchar(character, character, smallint, internal) TO service_role;


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 566
-- Name: FUNCTION gin_compare_prefix_bytea(bytea, bytea, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bytea(bytea, bytea, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bytea(bytea, bytea, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bytea(bytea, bytea, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_bytea(bytea, bytea, smallint, internal) TO service_role;


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 644
-- Name: FUNCTION gin_compare_prefix_char("char", "char", smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_char("char", "char", smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_char("char", "char", smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_char("char", "char", smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_char("char", "char", smallint, internal) TO service_role;


--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION gin_compare_prefix_cidr(cidr, cidr, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_cidr(cidr, cidr, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_cidr(cidr, cidr, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_cidr(cidr, cidr, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_cidr(cidr, cidr, smallint, internal) TO service_role;


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 539
-- Name: FUNCTION gin_compare_prefix_date(date, date, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_date(date, date, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_date(date, date, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_date(date, date, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_date(date, date, smallint, internal) TO service_role;


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 683
-- Name: FUNCTION gin_compare_prefix_float4(real, real, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float4(real, real, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float4(real, real, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float4(real, real, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float4(real, real, smallint, internal) TO service_role;


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 751
-- Name: FUNCTION gin_compare_prefix_float8(double precision, double precision, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float8(double precision, double precision, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float8(double precision, double precision, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float8(double precision, double precision, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_float8(double precision, double precision, smallint, internal) TO service_role;


--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 757
-- Name: FUNCTION gin_compare_prefix_inet(inet, inet, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_inet(inet, inet, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_inet(inet, inet, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_inet(inet, inet, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_inet(inet, inet, smallint, internal) TO service_role;


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 494
-- Name: FUNCTION gin_compare_prefix_int2(smallint, smallint, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int2(smallint, smallint, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int2(smallint, smallint, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int2(smallint, smallint, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int2(smallint, smallint, smallint, internal) TO service_role;


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 748
-- Name: FUNCTION gin_compare_prefix_int4(integer, integer, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int4(integer, integer, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int4(integer, integer, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int4(integer, integer, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int4(integer, integer, smallint, internal) TO service_role;


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 474
-- Name: FUNCTION gin_compare_prefix_int8(bigint, bigint, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int8(bigint, bigint, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int8(bigint, bigint, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int8(bigint, bigint, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_int8(bigint, bigint, smallint, internal) TO service_role;


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 769
-- Name: FUNCTION gin_compare_prefix_interval(interval, interval, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_interval(interval, interval, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_interval(interval, interval, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_interval(interval, interval, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_interval(interval, interval, smallint, internal) TO service_role;


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 674
-- Name: FUNCTION gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal) TO service_role;


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 639
-- Name: FUNCTION gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal) TO service_role;


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 654
-- Name: FUNCTION gin_compare_prefix_money(money, money, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_money(money, money, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_money(money, money, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_money(money, money, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_money(money, money, smallint, internal) TO service_role;


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 592
-- Name: FUNCTION gin_compare_prefix_name(name, name, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_name(name, name, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_name(name, name, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_name(name, name, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_name(name, name, smallint, internal) TO service_role;


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 632
-- Name: FUNCTION gin_compare_prefix_numeric(numeric, numeric, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_numeric(numeric, numeric, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_numeric(numeric, numeric, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_numeric(numeric, numeric, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_numeric(numeric, numeric, smallint, internal) TO service_role;


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 533
-- Name: FUNCTION gin_compare_prefix_oid(oid, oid, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_oid(oid, oid, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_oid(oid, oid, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_oid(oid, oid, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_oid(oid, oid, smallint, internal) TO service_role;


--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 509
-- Name: FUNCTION gin_compare_prefix_text(text, text, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_text(text, text, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_text(text, text, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_text(text, text, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_text(text, text, smallint, internal) TO service_role;


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 605
-- Name: FUNCTION gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal) TO service_role;


--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 698
-- Name: FUNCTION gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal) TO service_role;


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 538
-- Name: FUNCTION gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal) TO service_role;


--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 676
-- Name: FUNCTION gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal) TO service_role;


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 629
-- Name: FUNCTION gin_compare_prefix_uuid(uuid, uuid, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_uuid(uuid, uuid, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_uuid(uuid, uuid, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_uuid(uuid, uuid, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_uuid(uuid, uuid, smallint, internal) TO service_role;


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 540
-- Name: FUNCTION gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal) TO service_role;


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 552
-- Name: FUNCTION gin_enum_cmp(anyenum, anyenum); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_enum_cmp(anyenum, anyenum) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_enum_cmp(anyenum, anyenum) TO anon;
GRANT ALL ON FUNCTION extensions.gin_enum_cmp(anyenum, anyenum) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_enum_cmp(anyenum, anyenum) TO service_role;


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 551
-- Name: FUNCTION gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 557
-- Name: FUNCTION gin_extract_query_bit(bit, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_bit(bit, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bit(bit, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bit(bit, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bit(bit, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 760
-- Name: FUNCTION gin_extract_query_bool(boolean, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_bool(boolean, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bool(boolean, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bool(boolean, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bool(boolean, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 597
-- Name: FUNCTION gin_extract_query_bpchar(character, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_bpchar(character, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bpchar(character, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bpchar(character, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bpchar(character, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 601
-- Name: FUNCTION gin_extract_query_bytea(bytea, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_bytea(bytea, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bytea(bytea, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bytea(bytea, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_bytea(bytea, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 633
-- Name: FUNCTION gin_extract_query_char("char", internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_char("char", internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_char("char", internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_char("char", internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_char("char", internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 733
-- Name: FUNCTION gin_extract_query_cidr(cidr, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_cidr(cidr, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_cidr(cidr, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_cidr(cidr, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_cidr(cidr, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 692
-- Name: FUNCTION gin_extract_query_date(date, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_date(date, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_date(date, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_date(date, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_date(date, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 662
-- Name: FUNCTION gin_extract_query_float4(real, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_float4(real, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float4(real, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float4(real, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float4(real, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 507
-- Name: FUNCTION gin_extract_query_float8(double precision, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_float8(double precision, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float8(double precision, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float8(double precision, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_float8(double precision, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 635
-- Name: FUNCTION gin_extract_query_inet(inet, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_inet(inet, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_inet(inet, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_inet(inet, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_inet(inet, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 705
-- Name: FUNCTION gin_extract_query_int2(smallint, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_int2(smallint, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int2(smallint, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int2(smallint, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int2(smallint, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 537
-- Name: FUNCTION gin_extract_query_int4(integer, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_int4(integer, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int4(integer, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int4(integer, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int4(integer, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 701
-- Name: FUNCTION gin_extract_query_int8(bigint, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_int8(bigint, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int8(bigint, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int8(bigint, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_int8(bigint, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 489
-- Name: FUNCTION gin_extract_query_interval(interval, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_interval(interval, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_interval(interval, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_interval(interval, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_interval(interval, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 599
-- Name: FUNCTION gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 617
-- Name: FUNCTION gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 512
-- Name: FUNCTION gin_extract_query_money(money, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_money(money, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_money(money, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_money(money, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_money(money, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 638
-- Name: FUNCTION gin_extract_query_name(name, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_name(name, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_name(name, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_name(name, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_name(name, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 738
-- Name: FUNCTION gin_extract_query_numeric(numeric, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_numeric(numeric, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_numeric(numeric, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_numeric(numeric, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_numeric(numeric, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 768
-- Name: FUNCTION gin_extract_query_oid(oid, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_oid(oid, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_oid(oid, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_oid(oid, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_oid(oid, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 569
-- Name: FUNCTION gin_extract_query_text(text, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_text(text, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_text(text, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_text(text, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_text(text, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 505
-- Name: FUNCTION gin_extract_query_time(time without time zone, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_time(time without time zone, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_time(time without time zone, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_time(time without time zone, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_time(time without time zone, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 641
-- Name: FUNCTION gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 756
-- Name: FUNCTION gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 636
-- Name: FUNCTION gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO service_role;


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 556
-- Name: FUNCTION gin_extract_query_uuid(uuid, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_uuid(uuid, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_uuid(uuid, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_uuid(uuid, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_uuid(uuid, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 664
-- Name: FUNCTION gin_extract_query_varbit(bit varying, internal, smallint, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal) TO service_role;


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 765
-- Name: FUNCTION gin_extract_value_anyenum(anyenum, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_anyenum(anyenum, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_anyenum(anyenum, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_anyenum(anyenum, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_anyenum(anyenum, internal) TO service_role;


--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 767
-- Name: FUNCTION gin_extract_value_bit(bit, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_bit(bit, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bit(bit, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bit(bit, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bit(bit, internal) TO service_role;


--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 535
-- Name: FUNCTION gin_extract_value_bool(boolean, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_bool(boolean, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bool(boolean, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bool(boolean, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bool(boolean, internal) TO service_role;


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 573
-- Name: FUNCTION gin_extract_value_bpchar(character, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_bpchar(character, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bpchar(character, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bpchar(character, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bpchar(character, internal) TO service_role;


--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 658
-- Name: FUNCTION gin_extract_value_bytea(bytea, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_bytea(bytea, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bytea(bytea, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bytea(bytea, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_bytea(bytea, internal) TO service_role;


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 547
-- Name: FUNCTION gin_extract_value_char("char", internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_char("char", internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_char("char", internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_char("char", internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_char("char", internal) TO service_role;


--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 570
-- Name: FUNCTION gin_extract_value_cidr(cidr, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_cidr(cidr, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_cidr(cidr, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_cidr(cidr, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_cidr(cidr, internal) TO service_role;


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 762
-- Name: FUNCTION gin_extract_value_date(date, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_date(date, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_date(date, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_date(date, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_date(date, internal) TO service_role;


--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 467
-- Name: FUNCTION gin_extract_value_float4(real, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_float4(real, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float4(real, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float4(real, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float4(real, internal) TO service_role;


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 699
-- Name: FUNCTION gin_extract_value_float8(double precision, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_float8(double precision, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float8(double precision, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float8(double precision, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_float8(double precision, internal) TO service_role;


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 604
-- Name: FUNCTION gin_extract_value_inet(inet, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_inet(inet, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_inet(inet, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_inet(inet, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_inet(inet, internal) TO service_role;


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 642
-- Name: FUNCTION gin_extract_value_int2(smallint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_int2(smallint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int2(smallint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int2(smallint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int2(smallint, internal) TO service_role;


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 723
-- Name: FUNCTION gin_extract_value_int4(integer, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_int4(integer, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int4(integer, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int4(integer, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int4(integer, internal) TO service_role;


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 688
-- Name: FUNCTION gin_extract_value_int8(bigint, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_int8(bigint, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int8(bigint, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int8(bigint, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_int8(bigint, internal) TO service_role;


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 479
-- Name: FUNCTION gin_extract_value_interval(interval, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_interval(interval, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_interval(interval, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_interval(interval, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_interval(interval, internal) TO service_role;


--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 606
-- Name: FUNCTION gin_extract_value_macaddr(macaddr, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr(macaddr, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr(macaddr, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr(macaddr, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr(macaddr, internal) TO service_role;


--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 525
-- Name: FUNCTION gin_extract_value_macaddr8(macaddr8, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr8(macaddr8, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr8(macaddr8, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr8(macaddr8, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_macaddr8(macaddr8, internal) TO service_role;


--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 630
-- Name: FUNCTION gin_extract_value_money(money, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_money(money, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_money(money, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_money(money, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_money(money, internal) TO service_role;


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 652
-- Name: FUNCTION gin_extract_value_name(name, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_name(name, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_name(name, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_name(name, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_name(name, internal) TO service_role;


--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 600
-- Name: FUNCTION gin_extract_value_numeric(numeric, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_numeric(numeric, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_numeric(numeric, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_numeric(numeric, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_numeric(numeric, internal) TO service_role;


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 721
-- Name: FUNCTION gin_extract_value_oid(oid, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_oid(oid, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_oid(oid, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_oid(oid, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_oid(oid, internal) TO service_role;


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 587
-- Name: FUNCTION gin_extract_value_text(text, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_text(text, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_text(text, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_text(text, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_text(text, internal) TO service_role;


--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 598
-- Name: FUNCTION gin_extract_value_time(time without time zone, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_time(time without time zone, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_time(time without time zone, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_time(time without time zone, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_time(time without time zone, internal) TO service_role;


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 611
-- Name: FUNCTION gin_extract_value_timestamp(timestamp without time zone, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamp(timestamp without time zone, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamp(timestamp without time zone, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamp(timestamp without time zone, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamp(timestamp without time zone, internal) TO service_role;


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 584
-- Name: FUNCTION gin_extract_value_timestamptz(timestamp with time zone, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamptz(timestamp with time zone, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamptz(timestamp with time zone, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamptz(timestamp with time zone, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timestamptz(timestamp with time zone, internal) TO service_role;


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 490
-- Name: FUNCTION gin_extract_value_timetz(time with time zone, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_timetz(time with time zone, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timetz(time with time zone, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timetz(time with time zone, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_timetz(time with time zone, internal) TO service_role;


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 612
-- Name: FUNCTION gin_extract_value_trgm(text, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_trgm(text, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_trgm(text, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_trgm(text, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_trgm(text, internal) TO service_role;


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 700
-- Name: FUNCTION gin_extract_value_uuid(uuid, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_uuid(uuid, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_uuid(uuid, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_uuid(uuid, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_uuid(uuid, internal) TO service_role;


--
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 590
-- Name: FUNCTION gin_extract_value_varbit(bit varying, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_extract_value_varbit(bit varying, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_extract_value_varbit(bit varying, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_extract_value_varbit(bit varying, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_extract_value_varbit(bit varying, internal) TO service_role;


--
-- TOC entry 5322 (class 0 OID 0)
-- Dependencies: 545
-- Name: FUNCTION gin_numeric_cmp(numeric, numeric); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_numeric_cmp(numeric, numeric) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_numeric_cmp(numeric, numeric) TO anon;
GRANT ALL ON FUNCTION extensions.gin_numeric_cmp(numeric, numeric) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_numeric_cmp(numeric, numeric) TO service_role;


--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 665
-- Name: FUNCTION gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO service_role;


--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 643
-- Name: FUNCTION gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO service_role;


--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 656
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 621
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 764
-- Name: FUNCTION gtrgm_compress(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_compress(internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_compress(internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_compress(internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_compress(internal) TO service_role;


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 504
-- Name: FUNCTION gtrgm_consistent(internal, text, smallint, oid, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_consistent(internal, text, smallint, oid, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_consistent(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_consistent(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_consistent(internal, text, smallint, oid, internal) TO service_role;


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 631
-- Name: FUNCTION gtrgm_decompress(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_decompress(internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_decompress(internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_decompress(internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_decompress(internal) TO service_role;


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 522
-- Name: FUNCTION gtrgm_distance(internal, text, smallint, oid, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_distance(internal, text, smallint, oid, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_distance(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_distance(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_distance(internal, text, smallint, oid, internal) TO service_role;


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 506
-- Name: FUNCTION gtrgm_options(internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_options(internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_options(internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_options(internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_options(internal) TO service_role;


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 695
-- Name: FUNCTION gtrgm_penalty(internal, internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_penalty(internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_penalty(internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_penalty(internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_penalty(internal, internal, internal) TO service_role;


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 730
-- Name: FUNCTION gtrgm_picksplit(internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_picksplit(internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_picksplit(internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_picksplit(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_picksplit(internal, internal) TO service_role;


--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 777
-- Name: FUNCTION gtrgm_same(extensions.gtrgm, extensions.gtrgm, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_same(extensions.gtrgm, extensions.gtrgm, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_same(extensions.gtrgm, extensions.gtrgm, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_same(extensions.gtrgm, extensions.gtrgm, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_same(extensions.gtrgm, extensions.gtrgm, internal) TO service_role;


--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 561
-- Name: FUNCTION gtrgm_union(internal, internal); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gtrgm_union(internal, internal) TO postgres;
GRANT ALL ON FUNCTION extensions.gtrgm_union(internal, internal) TO anon;
GRANT ALL ON FUNCTION extensions.gtrgm_union(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION extensions.gtrgm_union(internal, internal) TO service_role;


--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 510
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 740
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 680
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 761
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 663
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 572
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 568
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 727
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 472
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 731
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 517
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 752
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 745
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 589
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 579
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 548
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 724
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 726
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 583
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 728
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 725
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- TOC entry 5361 (class 0 OID 0)
-- Dependencies: 773
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- TOC entry 5362 (class 0 OID 0)
-- Dependencies: 607
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- TOC entry 5363 (class 0 OID 0)
-- Dependencies: 528
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- TOC entry 5364 (class 0 OID 0)
-- Dependencies: 736
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- TOC entry 5365 (class 0 OID 0)
-- Dependencies: 469
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- TOC entry 5366 (class 0 OID 0)
-- Dependencies: 681
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- TOC entry 5367 (class 0 OID 0)
-- Dependencies: 670
-- Name: FUNCTION regexp_match(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5368 (class 0 OID 0)
-- Dependencies: 729
-- Name: FUNCTION regexp_match(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_match(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5369 (class 0 OID 0)
-- Dependencies: 714
-- Name: FUNCTION regexp_matches(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5370 (class 0 OID 0)
-- Dependencies: 544
-- Name: FUNCTION regexp_matches(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_matches(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5371 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION regexp_replace(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5372 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION regexp_replace(extensions.citext, extensions.citext, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_replace(extensions.citext, extensions.citext, text, text) TO service_role;


--
-- TOC entry 5373 (class 0 OID 0)
-- Dependencies: 473
-- Name: FUNCTION regexp_split_to_array(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5374 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION regexp_split_to_array(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_split_to_array(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5375 (class 0 OID 0)
-- Dependencies: 715
-- Name: FUNCTION regexp_split_to_table(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5376 (class 0 OID 0)
-- Dependencies: 596
-- Name: FUNCTION regexp_split_to_table(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.regexp_split_to_table(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5377 (class 0 OID 0)
-- Dependencies: 503
-- Name: FUNCTION replace(extensions.citext, extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.replace(extensions.citext, extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.replace(extensions.citext, extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.replace(extensions.citext, extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.replace(extensions.citext, extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5379 (class 0 OID 0)
-- Dependencies: 501
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 711
-- Name: FUNCTION set_limit(real); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_limit(real) TO postgres;
GRANT ALL ON FUNCTION extensions.set_limit(real) TO anon;
GRANT ALL ON FUNCTION extensions.set_limit(real) TO authenticated;
GRANT ALL ON FUNCTION extensions.set_limit(real) TO service_role;


--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 614
-- Name: FUNCTION show_limit(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.show_limit() TO postgres;
GRANT ALL ON FUNCTION extensions.show_limit() TO anon;
GRANT ALL ON FUNCTION extensions.show_limit() TO authenticated;
GRANT ALL ON FUNCTION extensions.show_limit() TO service_role;


--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 774
-- Name: FUNCTION show_trgm(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.show_trgm(text) TO postgres;
GRANT ALL ON FUNCTION extensions.show_trgm(text) TO anon;
GRANT ALL ON FUNCTION extensions.show_trgm(text) TO authenticated;
GRANT ALL ON FUNCTION extensions.show_trgm(text) TO service_role;


--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 520
-- Name: FUNCTION similarity(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.similarity(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.similarity(text, text) TO service_role;


--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 653
-- Name: FUNCTION similarity_dist(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.similarity_dist(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.similarity_dist(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.similarity_dist(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.similarity_dist(text, text) TO service_role;


--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 475
-- Name: FUNCTION similarity_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.similarity_op(text, text) TO service_role;


--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 645
-- Name: FUNCTION split_part(extensions.citext, extensions.citext, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.split_part(extensions.citext, extensions.citext, integer) TO postgres;
GRANT ALL ON FUNCTION extensions.split_part(extensions.citext, extensions.citext, integer) TO anon;
GRANT ALL ON FUNCTION extensions.split_part(extensions.citext, extensions.citext, integer) TO authenticated;
GRANT ALL ON FUNCTION extensions.split_part(extensions.citext, extensions.citext, integer) TO service_role;


--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 649
-- Name: FUNCTION strict_word_similarity(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strict_word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.strict_word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.strict_word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.strict_word_similarity(text, text) TO service_role;


--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 536
-- Name: FUNCTION strict_word_similarity_commutator_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strict_word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_commutator_op(text, text) TO service_role;


--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 495
-- Name: FUNCTION strict_word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_commutator_op(text, text) TO service_role;


--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 702
-- Name: FUNCTION strict_word_similarity_dist_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_dist_op(text, text) TO service_role;


--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 555
-- Name: FUNCTION strict_word_similarity_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strict_word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.strict_word_similarity_op(text, text) TO service_role;


--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 742
-- Name: FUNCTION strpos(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.strpos(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.strpos(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.strpos(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.strpos(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 586
-- Name: FUNCTION texticlike(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 554
-- Name: FUNCTION texticlike(extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticlike(extensions.citext, text) TO service_role;


--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 516
-- Name: FUNCTION texticnlike(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 615
-- Name: FUNCTION texticnlike(extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticnlike(extensions.citext, text) TO service_role;


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 754
-- Name: FUNCTION texticregexeq(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 609
-- Name: FUNCTION texticregexeq(extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticregexeq(extensions.citext, text) TO service_role;


--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 696
-- Name: FUNCTION texticregexne(extensions.citext, extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, extensions.citext) TO service_role;


--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 477
-- Name: FUNCTION texticregexne(extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.texticregexne(extensions.citext, text) TO service_role;


--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 720
-- Name: FUNCTION translate(extensions.citext, extensions.citext, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.translate(extensions.citext, extensions.citext, text) TO postgres;
GRANT ALL ON FUNCTION extensions.translate(extensions.citext, extensions.citext, text) TO anon;
GRANT ALL ON FUNCTION extensions.translate(extensions.citext, extensions.citext, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.translate(extensions.citext, extensions.citext, text) TO service_role;


--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 591
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 697
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 470
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 524
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 546
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 647
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 549
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 737
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 637
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 651
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 578
-- Name: FUNCTION word_similarity(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.word_similarity(text, text) TO service_role;


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 593
-- Name: FUNCTION word_similarity_commutator_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.word_similarity_commutator_op(text, text) TO service_role;


--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 679
-- Name: FUNCTION word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_commutator_op(text, text) TO service_role;


--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 758
-- Name: FUNCTION word_similarity_dist_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.word_similarity_dist_op(text, text) TO service_role;


--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 655
-- Name: FUNCTION word_similarity_op(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION extensions.word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION extensions.word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION extensions.word_similarity_op(text, text) TO service_role;


--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 743
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- TOC entry 5418 (class 0 OID 0)
-- Dependencies: 585
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- TOC entry 5419 (class 0 OID 0)
-- Dependencies: 448
-- Name: TABLE product_reviews_raw; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.product_reviews_raw TO anon;
GRANT SELECT ON TABLE public.product_reviews_raw TO authenticated;
GRANT ALL ON TABLE public.product_reviews_raw TO service_role;
GRANT SELECT ON TABLE public.product_reviews_raw TO ro_role;


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 471
-- Name: FUNCTION add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text) TO anon;
GRANT ALL ON FUNCTION public.add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text) TO authenticated;
GRANT ALL ON FUNCTION public.add_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text) TO service_role;


--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 449
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reviews TO anon;
GRANT SELECT ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;
GRANT SELECT ON TABLE public.reviews TO ro_role;


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 523
-- Name: FUNCTION add_review(p_product_id bigint, p_rating integer, p_title text, p_body text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) TO anon;
GRANT ALL ON FUNCTION public.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) TO authenticated;
GRANT ALL ON FUNCTION public.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) TO service_role;


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 529
-- Name: FUNCTION admin_set_review_status(p_review_id uuid, p_status text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) TO anon;
GRANT ALL ON FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_review_status(p_review_id uuid, p_status text) TO service_role;


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 746
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 519
-- Name: FUNCTION meta_columns(schemas text[], tbl text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.meta_columns(schemas text[], tbl text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meta_columns(schemas text[], tbl text) TO service_role;


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 744
-- Name: FUNCTION meta_policies(schemas text[]); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.meta_policies(schemas text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meta_policies(schemas text[]) TO service_role;


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 666
-- Name: FUNCTION meta_tables(schemas text[]); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.meta_tables(schemas text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meta_tables(schemas text[]) TO service_role;


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 763
-- Name: FUNCTION meta_views(schemas text[]); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.meta_views(schemas text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meta_views(schemas text[]) TO service_role;


--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION place_order(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.place_order(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.place_order(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.place_order(p_user_id uuid) TO service_role;


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 706
-- Name: FUNCTION place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text) TO authenticated;
GRANT ALL ON FUNCTION public.place_order_with_items(p_user_id uuid, p_items jsonb, p_currency text) TO service_role;


--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 496
-- Name: FUNCTION recalc_order_totals(p_order_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalc_order_totals(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.recalc_order_totals(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.recalc_order_totals(p_order_id uuid) TO service_role;


--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 675
-- Name: FUNCTION recalc_product_rating(p_product_uid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalc_product_rating(p_product_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.recalc_product_rating(p_product_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.recalc_product_rating(p_product_uid uuid) TO service_role;


--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 608
-- Name: FUNCTION secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.secure_submit_review_unified(p_source_schema text, p_source_table text, p_source_pk text, p_rating smallint, p_title text, p_body text, p_ip_hash text, p_user_agent text, p_user_id uuid) TO service_role;


--
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 588
-- Name: FUNCTION set_settings_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_settings_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_settings_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_settings_updated_at() TO service_role;


--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 772
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- TOC entry 5436 (class 0 OID 0)
-- Dependencies: 648
-- Name: FUNCTION tr_payments_status_propagate(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tr_payments_status_propagate() TO anon;
GRANT ALL ON FUNCTION public.tr_payments_status_propagate() TO authenticated;
GRANT ALL ON FUNCTION public.tr_payments_status_propagate() TO service_role;


--
-- TOC entry 5437 (class 0 OID 0)
-- Dependencies: 518
-- Name: FUNCTION tr_recalc_after_order_items(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tr_recalc_after_order_items() TO anon;
GRANT ALL ON FUNCTION public.tr_recalc_after_order_items() TO authenticated;
GRANT ALL ON FUNCTION public.tr_recalc_after_order_items() TO service_role;


--
-- TOC entry 5438 (class 0 OID 0)
-- Dependencies: 478
-- Name: FUNCTION tr_recalc_after_review_unified(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tr_recalc_after_review_unified() TO anon;
GRANT ALL ON FUNCTION public.tr_recalc_after_review_unified() TO authenticated;
GRANT ALL ON FUNCTION public.tr_recalc_after_review_unified() TO service_role;


--
-- TOC entry 5439 (class 0 OID 0)
-- Dependencies: 690
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 759
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 689
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 712
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 574
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 713
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 521
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 542
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 534
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 515
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 595
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 650
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 527
-- Name: FUNCTION add_review(p_product_id bigint, p_rating integer, p_title text, p_body text); Type: ACL; Schema: shop; Owner: postgres
--

REVOKE ALL ON FUNCTION shop.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION shop.add_review(p_product_id bigint, p_rating integer, p_title text, p_body text) TO authenticated;


--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 500
-- Name: FUNCTION compute_price(p_product_id bigint, p_variant_id bigint, p_qty integer, p_coupon text); Type: ACL; Schema: shop; Owner: postgres
--

GRANT ALL ON FUNCTION shop.compute_price(p_product_id bigint, p_variant_id bigint, p_qty integer, p_coupon text) TO anon;
GRANT ALL ON FUNCTION shop.compute_price(p_product_id bigint, p_variant_id bigint, p_qty integer, p_coupon text) TO authenticated;


--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 481
-- Name: FUNCTION moderate_review(p_review_id bigint, p_status text); Type: ACL; Schema: shop; Owner: postgres
--

REVOKE ALL ON FUNCTION shop.moderate_review(p_review_id bigint, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION shop.moderate_review(p_review_id bigint, p_status text) TO authenticated;


--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 532
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 499
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 619
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 1714
-- Name: FUNCTION max(extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.max(extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.max(extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.max(extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.max(extensions.citext) TO service_role;


--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 1713
-- Name: FUNCTION min(extensions.citext); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.min(extensions.citext) TO postgres;
GRANT ALL ON FUNCTION extensions.min(extensions.citext) TO anon;
GRANT ALL ON FUNCTION extensions.min(extensions.citext) TO authenticated;
GRANT ALL ON FUNCTION extensions.min(extensions.citext) TO service_role;


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 436
-- Name: TABLE events; Type: ACL; Schema: aff; Owner: postgres
--

GRANT SELECT ON TABLE aff.events TO ro_role;


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 437
-- Name: TABLE offer_stats_30d; Type: ACL; Schema: aff; Owner: postgres
--

GRANT SELECT ON TABLE aff.offer_stats_30d TO ro_role;


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 434
-- Name: TABLE offers; Type: ACL; Schema: aff; Owner: postgres
--

GRANT SELECT ON TABLE aff.offers TO ro_role;


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 452
-- Name: TABLE product_catalog; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.product_catalog TO anon;
GRANT SELECT ON TABLE public.product_catalog TO authenticated;
GRANT ALL ON TABLE public.product_catalog TO service_role;
GRANT SELECT ON TABLE public.product_catalog TO ro_role;


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 454
-- Name: TABLE product_rating_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.product_rating_stats TO anon;
GRANT SELECT ON TABLE public.product_rating_stats TO authenticated;
GRANT ALL ON TABLE public.product_rating_stats TO service_role;
GRANT SELECT ON TABLE public.product_rating_stats TO ro_role;


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 458
-- Name: TABLE offers_with_ratings; Type: ACL; Schema: aff; Owner: postgres
--

GRANT SELECT ON TABLE aff.offers_with_ratings TO ro_role;


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 432
-- Name: TABLE sources; Type: ACL; Schema: aff; Owner: postgres
--

GRANT SELECT ON TABLE aff.sources TO ro_role;


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 374
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 381
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 360
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 379
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 372
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 377
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE addresses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.addresses TO anon;
GRANT ALL ON TABLE public.addresses TO authenticated;
GRANT ALL ON TABLE public.addresses TO service_role;
GRANT SELECT ON TABLE public.addresses TO ro_role;


--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 412
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT SELECT ON TABLE public.audit_log TO ro_role;


--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 411
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO ro_role;


--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE cart_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart_items TO authenticated;
GRANT ALL ON TABLE public.cart_items TO service_role;
GRANT SELECT ON TABLE public.cart_items TO ro_role;


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE carts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.carts TO anon;
GRANT ALL ON TABLE public.carts TO authenticated;
GRANT ALL ON TABLE public.carts TO service_role;
GRANT SELECT ON TABLE public.carts TO ro_role;


--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 444
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO service_role;
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT ON TABLE public.categories TO authenticated;
GRANT SELECT ON TABLE public.categories TO ro_role;


--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 409
-- Name: TABLE coupon_redemptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coupon_redemptions TO anon;
GRANT ALL ON TABLE public.coupon_redemptions TO authenticated;
GRANT ALL ON TABLE public.coupon_redemptions TO service_role;
GRANT SELECT ON TABLE public.coupon_redemptions TO ro_role;


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 408
-- Name: TABLE coupons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coupons TO anon;
GRANT ALL ON TABLE public.coupons TO authenticated;
GRANT ALL ON TABLE public.coupons TO service_role;
GRANT SELECT ON TABLE public.coupons TO ro_role;


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE ecom_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ecom_categories TO anon;
GRANT ALL ON TABLE public.ecom_categories TO authenticated;
GRANT ALL ON TABLE public.ecom_categories TO service_role;
GRANT SELECT ON TABLE public.ecom_categories TO ro_role;


--
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE ecom_products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ecom_products TO anon;
GRANT ALL ON TABLE public.ecom_products TO authenticated;
GRANT ALL ON TABLE public.ecom_products TO service_role;
GRANT SELECT ON TABLE public.ecom_products TO ro_role;


--
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 456
-- Name: TABLE ecom_products_with_ratings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ecom_products_with_ratings TO anon;
GRANT SELECT ON TABLE public.ecom_products_with_ratings TO authenticated;
GRANT ALL ON TABLE public.ecom_products_with_ratings TO service_role;
GRANT SELECT ON TABLE public.ecom_products_with_ratings TO ro_role;


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 399
-- Name: TABLE ecom_wishlist; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ecom_wishlist TO anon;
GRANT ALL ON TABLE public.ecom_wishlist TO authenticated;
GRANT ALL ON TABLE public.ecom_wishlist TO service_role;
GRANT SELECT ON TABLE public.ecom_wishlist TO ro_role;


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 461
-- Name: TABLE line_total_is_generated; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.line_total_is_generated TO anon;
GRANT SELECT ON TABLE public.line_total_is_generated TO authenticated;
GRANT ALL ON TABLE public.line_total_is_generated TO service_role;
GRANT SELECT ON TABLE public.line_total_is_generated TO ro_role;


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 396
-- Name: SEQUENCE offers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.offers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.offers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.offers_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.offers_id_seq TO ro_role;


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 404
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT SELECT ON TABLE public.order_items TO ro_role;


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 403
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT ON TABLE public.orders TO ro_role;


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT SELECT ON TABLE public.payments TO ro_role;


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 463
-- Name: TABLE order_history_v; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.order_history_v TO anon;
GRANT SELECT ON TABLE public.order_history_v TO authenticated;
GRANT ALL ON TABLE public.order_history_v TO service_role;
GRANT SELECT ON TABLE public.order_history_v TO ro_role;


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 462
-- Name: TABLE order_items_v; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.order_items_v TO anon;
GRANT SELECT ON TABLE public.order_items_v TO authenticated;
GRANT ALL ON TABLE public.order_items_v TO service_role;
GRANT SELECT ON TABLE public.order_items_v TO ro_role;


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 450
-- Name: TABLE product_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.product_reviews TO anon;
GRANT SELECT ON TABLE public.product_reviews TO authenticated;
GRANT ALL ON TABLE public.product_reviews TO service_role;
GRANT SELECT ON TABLE public.product_reviews TO ro_role;


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 453
-- Name: TABLE reviews_unified; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reviews_unified TO anon;
GRANT SELECT ON TABLE public.reviews_unified TO authenticated;
GRANT ALL ON TABLE public.reviews_unified TO service_role;
GRANT SELECT ON TABLE public.reviews_unified TO ro_role;


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 459
-- Name: TABLE product_reviews_admin_v; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.product_reviews_admin_v TO anon;
GRANT SELECT ON TABLE public.product_reviews_admin_v TO authenticated;
GRANT ALL ON TABLE public.product_reviews_admin_v TO service_role;
GRANT SELECT ON TABLE public.product_reviews_admin_v TO ro_role;


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 430
-- Name: TABLE reviews; Type: ACL; Schema: shop; Owner: postgres
--

GRANT SELECT ON TABLE shop.reviews TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE shop.reviews TO authenticated;


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 447
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;
GRANT SELECT ON TABLE public.products TO ro_role;


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO ro_role;


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 455
-- Name: TABLE review_rate_limits; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.review_rate_limits TO anon;
GRANT SELECT ON TABLE public.review_rate_limits TO authenticated;
GRANT ALL ON TABLE public.review_rate_limits TO service_role;
GRANT SELECT ON TABLE public.review_rate_limits TO ro_role;


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE reviews__backup_20250909_181553; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reviews__backup_20250909_181553 TO anon;
GRANT ALL ON TABLE public.reviews__backup_20250909_181553 TO authenticated;
GRANT ALL ON TABLE public.reviews__backup_20250909_181553 TO service_role;
GRANT SELECT ON TABLE public.reviews__backup_20250909_181553 TO ro_role;


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 443
-- Name: TABLE reviews__backup_20250909_181804; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reviews__backup_20250909_181804 TO anon;
GRANT ALL ON TABLE public.reviews__backup_20250909_181804 TO authenticated;
GRANT ALL ON TABLE public.reviews__backup_20250909_181804 TO service_role;
GRANT SELECT ON TABLE public.reviews__backup_20250909_181804 TO ro_role;


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 451
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.settings TO anon;
GRANT SELECT ON TABLE public.settings TO authenticated;
GRANT ALL ON TABLE public.settings TO service_role;
GRANT SELECT ON TABLE public.settings TO ro_role;


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 406
-- Name: TABLE shipments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipments TO anon;
GRANT ALL ON TABLE public.shipments TO authenticated;
GRANT ALL ON TABLE public.shipments TO service_role;
GRANT SELECT ON TABLE public.shipments TO ro_role;


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 460
-- Name: TABLE total_is_generated; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.total_is_generated TO anon;
GRANT SELECT ON TABLE public.total_is_generated TO authenticated;
GRANT ALL ON TABLE public.total_is_generated TO service_role;
GRANT SELECT ON TABLE public.total_is_generated TO ro_role;


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 382
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- TOC entry 5543 (class 0 OID 0)
-- Dependencies: 387
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- TOC entry 5544 (class 0 OID 0)
-- Dependencies: 386
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- TOC entry 5554 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- TOC entry 5555 (class 0 OID 0)
-- Dependencies: 392
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- TOC entry 5557 (class 0 OID 0)
-- Dependencies: 366
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- TOC entry 5558 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- TOC entry 5559 (class 0 OID 0)
-- Dependencies: 383
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- TOC entry 5560 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- TOC entry 5563 (class 0 OID 0)
-- Dependencies: 368
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- TOC entry 5564 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- TOC entry 3036 (class 826 OID 66292)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: aff; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA aff GRANT SELECT ON TABLES TO ro_role;


--
-- TOC entry 3021 (class 826 OID 16603)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- TOC entry 3022 (class 826 OID 16604)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- TOC entry 3020 (class 826 OID 16602)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- TOC entry 3031 (class 826 OID 16682)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- TOC entry 3030 (class 826 OID 16681)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- TOC entry 3029 (class 826 OID 16680)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- TOC entry 3034 (class 826 OID 16637)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 3033 (class 826 OID 16636)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 3032 (class 826 OID 16635)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 3026 (class 826 OID 16617)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 3028 (class 826 OID 16616)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 3027 (class 826 OID 16615)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 3013 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 3014 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 3012 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 3016 (class 826 OID 16493)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 3035 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO ro_role;


--
-- TOC entry 3015 (class 826 OID 16492)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 3024 (class 826 OID 16607)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- TOC entry 3025 (class 826 OID 16608)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- TOC entry 3023 (class 826 OID 16606)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- TOC entry 3019 (class 826 OID 16545)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 3018 (class 826 OID 16544)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 3017 (class 826 OID 16543)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 4211 (class 3466 OID 16621)
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- TOC entry 4216 (class 3466 OID 16700)
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- TOC entry 4210 (class 3466 OID 16619)
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- TOC entry 4217 (class 3466 OID 16703)
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- TOC entry 4212 (class 3466 OID 16622)
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- TOC entry 4213 (class 3466 OID 16623)
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- TOC entry 5156 (class 0 OID 52022)
-- Dependencies: 445 5167
-- Name: product_ratings; Type: MATERIALIZED VIEW DATA; Schema: shop; Owner: postgres
--

REFRESH MATERIALIZED VIEW shop.product_ratings;


-- Completed on 2025-09-14 22:14:34

--
-- PostgreSQL database dump complete
--

\unrestrict 0TFRbw86Jr1dHPUk0pGJ8005cWZ0exIvwOGPQhu0WR7n7JQ0OvvdIGhmlSO6ix2

