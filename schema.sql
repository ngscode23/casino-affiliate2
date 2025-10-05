--
-- PostgreSQL database dump
--

\restrict o0jhiB9xCHhRn4edYG6xOwgeFZ3H33d4iD6yYUelW9w6o6D85hQDK5hLaiDYE8V

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

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
-- Name: _backup; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA _backup;


--
-- Name: aff; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA aff;


--
-- Name: archive; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA archive;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: backups; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA backups;


--
-- Name: cleanup_backup; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cleanup_backup;


--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: dba; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA dba;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: internal; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA internal;


--
-- Name: meta; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA meta;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA stripe;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: sys; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sys;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: http; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;


--
-- Name: EXTENSION http; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION http IS 'HTTP client for PostgreSQL, allows web page retrieval inside the database.';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: wrappers; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;


--
-- Name: EXTENSION wrappers; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION wrappers IS 'Foreign data wrappers developed by Supabase';


--
-- Name: event_type; Type: TYPE; Schema: aff; Owner: -
--

CREATE TYPE aff.event_type AS ENUM (
    'impression',
    'click',
    'purchase'
);


--
-- Name: placement_tier; Type: TYPE; Schema: aff; Owner: -
--

CREATE TYPE aff.placement_tier AS ENUM (
    'gold',
    'silver',
    'bronze'
);


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: currency_code; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.currency_code AS character(3)
	CONSTRAINT currency_code_check CHECK ((VALUE ~ '^[A-Z]{3}$'::text));


--
-- Name: email_citext; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.email_citext AS extensions.citext
	CONSTRAINT email_citext_check CHECK ((POSITION(('@'::text) IN (VALUE)) > 1));


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded',
    'canceled',
    'failed'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'authorized',
    'captured',
    'paid',
    'canceled'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
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


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


--
-- Name: track_event(aff.event_type, bigint, text, text, text); Type: FUNCTION; Schema: aff; Owner: -
--

CREATE FUNCTION aff.track_event(p_type aff.event_type, p_offer_id bigint, p_session text, p_ip_hash text, p_ua text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  insert into aff.events(event_type, offer_id, session_id, ip_hash, user_agent)
  values (p_type, p_offer_id, p_session, p_ip_hash, p_ua);
$$;


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
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


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
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


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
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


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
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


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: _fmt_bytes(bigint); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._fmt_bytes(p bigint) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$ SELECT pg_size_pretty(p) $$;


--
-- Name: _http_post_json(text, text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._http_post_json(p_url text, p_body text, p_auth text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_req_id bigint;
BEGIN
  -- pg_net: отправляем + собираем через нашу обёртку
  BEGIN
    v_req_id := net.http_post(
      url := p_url,
      headers := jsonb_strip_nulls(jsonb_build_object(
        'Content-Type','application/json',
        'Accept','application/json',
        'Authorization', CASE WHEN p_auth IS NOT NULL THEN p_auth END
      )),
      body := p_body::jsonb
    );

    RETURN dba.http_collect_response_json(v_req_id, TRUE);
  EXCEPTION WHEN undefined_table OR undefined_function THEN
    -- ...тут остаются твои fallbacks на extensions.http_post/http() и т.д...
  END;

  RAISE EXCEPTION 'No HTTP client available: install extension pg_net or http';
END;
$$;


--
-- Name: _is_admin(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._is_admin(p_chat_id text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce((SELECT (admin_chat_ids @> ARRAY[p_chat_id]) FROM dba.bot_acl WHERE id=1), false);
$$;


--
-- Name: _is_allowed(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._is_allowed(p_chat_id text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce((SELECT enabled FROM dba.telegram_settings WHERE id=1),false)
     AND coalesce((SELECT cardinality(allowed_chat_ids) = 0 OR (allowed_chat_ids @> ARRAY[p_chat_id]) FROM dba.bot_acl WHERE id=1), true);
$$;


--
-- Name: _schema_context(integer, integer); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._schema_context(p_max_tables integer DEFAULT 12, p_max_cols integer DEFAULT 12) RETURNS text
    LANGUAGE sql STABLE
    AS $$
WITH tabs AS (
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
  ORDER BY (CASE WHEN table_schema='public' THEN 0 ELSE 1 END), table_schema, table_name
  LIMIT p_max_tables
), cols AS (
  SELECT table_schema, table_name, column_name, data_type, ordinal_position,
         row_number() OVER (PARTITION BY table_schema, table_name ORDER BY ordinal_position) AS rn
  FROM information_schema.columns c
  WHERE (table_schema, table_name) IN (SELECT table_schema, table_name FROM tabs)
)
SELECT string_agg(
         format('%s.%s(%s)', table_schema, table_name,
                (SELECT string_agg(column_name||':'||data_type, ', ' ORDER BY ordinal_position)
                 FROM cols c2
                 WHERE c2.table_schema = c.table_schema AND c2.table_name=c.table_name AND rn <= p_max_cols)
         ), E'
')
FROM (SELECT DISTINCT table_schema, table_name FROM cols) c;
$$;


--
-- Name: _tg_reply(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._tg_reply(p_chat_id text, p_msg text) RETURNS void
    LANGUAGE plpgsql
    AS $$ BEGIN PERFORM dba._tg_send_to(p_chat_id, p_msg); END; $$;


--
-- Name: _tg_send(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._tg_send(msg text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_token  text;
  v_chat   text;
  v_enabled boolean;
  v_url    text;
  v_resp   json;
BEGIN
  SELECT bot_token, chat_id, enabled
  INTO v_token, v_chat, v_enabled
  FROM dba.telegram_settings WHERE id = 1;

  IF NOT v_enabled OR v_token IS NULL OR v_chat IS NULL THEN
    RETURN;
  END IF;

  v_url := 'https://api.telegram.org/bot' || v_token || '/sendMessage';

  -- универсальная сигнатура: (url, content, content_type [, headers])
  SELECT (extensions.http_post(
           v_url,
           json_build_object(
             'chat_id',    v_chat,
             'text',       msg,
             'parse_mode', 'Markdown'
           )::text,
           'application/json'
         )).content::json
    INTO v_resp;

  -- при желании можно проверять v_resp->>'ok' = 'true'
EXCEPTION WHEN others THEN
  -- не падаем из-за Telegram, «молча» пропускаем
  NULL;
END; $$;


--
-- Name: _tg_send_to(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba._tg_send_to(p_chat_id text, p_msg text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v_token text; v_enabled boolean; v_url text; BEGIN
  SELECT bot_token, enabled INTO v_token, v_enabled FROM dba.telegram_settings WHERE id=1;
  IF NOT v_enabled OR v_token IS NULL OR p_chat_id IS NULL THEN RETURN; END IF;
  v_url := 'https://api.telegram.org/bot'||v_token||'/sendMessage';
  PERFORM (extensions.http_post(v_url, json_build_object('chat_id', p_chat_id, 'text', p_msg, 'parse_mode','Markdown')::text, 'application/json')).content;
EXCEPTION WHEN others THEN NULL;
END;$$;


--
-- Name: ai_chat(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.ai_chat(p_prompt text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'dba', 'public'
    AS $$
DECLARE
  v_base text; v_key text; v_model text; v_sys text;
  v_url text; v_req json; v_resp json; v_text text;
BEGIN
  SELECT api_base, api_key, model, system_prompt
    INTO v_base, v_key, v_model, v_sys
  FROM dba.ai_settings WHERE id = 1;

  IF coalesce(v_key,'') = '' THEN
    RETURN '⚠️ AI не настроен: заполни dba.ai_settings.api_key';
  END IF;

  v_url := v_base || '/chat/completions';
  v_req := json_build_object(
    'model', v_model,
    'messages', json_build_array(
      json_build_object('role','system','content', v_sys),
      json_build_object('role','user','content',  p_prompt)
    ),
    'temperature', 0.2,
    'max_tokens', 600
  );

  v_resp := dba._http_post_json(v_url, v_req::text, 'Bearer '||v_key);
  v_text := coalesce(v_resp->'choices'->0->'message'->>'content', v_resp::text);
  RETURN left(v_text, 4000);
EXCEPTION WHEN others THEN
  RETURN '❌ AI error: '||SQLERRM;
END;
$$;


--
-- Name: check_autovacuum(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.check_autovacuum() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO dba.alerts(level, kind, details)
  SELECT 'WARN','AUTOVAC_DEAD_TUPLES',
         format('%I.%I dead=%s live=%s', n.nspname, c.relname,
                pg_stat_get_dead_tuples(c.oid), pg_stat_get_live_tuples(c.oid))
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND pg_stat_get_dead_tuples(c.oid) > 100000  -- порог под себя
  ON CONFLICT DO NOTHING;
END; $$;


--
-- Name: check_freeze_age(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.check_freeze_age() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO dba.alerts(level,kind,details)
  SELECT 'WARN','FREEZE_AGE',
         format('%I.%I age=%s', n.nspname, c.relname, age(relfrozenxid))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind IN ('r','m') AND age(relfrozenxid) > 1500000000; -- порог
END; $$;


--
-- Name: check_missing_fk_indexes(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.check_missing_fk_indexes() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO dba.alerts(level,kind,details)
  SELECT 'WARN','FK_NO_INDEX',
         format('%I.%I -> %I.%I col=%s',
           ns.nspname, rel.relname, nr.nspname, r.relname, a.attname)
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid=c.conrelid
  JOIN pg_namespace ns ON ns.oid=rel.relnamespace
  JOIN pg_class r ON r.oid=c.confrelid
  JOIN pg_namespace nr ON nr.oid=r.relnamespace
  JOIN unnest(c.conkey) WITH ORDINALITY ck(colnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid=rel.oid AND a.attnum=ck.colnum
  WHERE c.contype='f'
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = rel.oid AND i.indisvalid
        AND (a.attnum = ANY(i.indkey))
    );
END; $$;


--
-- Name: check_replication_lag(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.check_replication_lag() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE lag interval;
BEGIN
  SELECT greatest(max(now()-pg_last_xact_replay_timestamp()), interval '0') INTO lag
  FROM pg_stat_replication;
  IF lag IS NOT NULL AND lag > interval '30 seconds' THEN
    INSERT INTO dba.alerts(level,kind,details) VALUES ('WARN','REPL_LAG', lag::text);
  END IF;
END; $$;


--
-- Name: cmd_explain(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_explain(p_chat text, p_sql text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE ctx text; prompt text; ans text; chunk text; BEGIN
  IF coalesce(length(p_sql),0) < 6 THEN
    PERFORM dba._tg_reply(p_chat, 'Дай SQL после /explain …'); RETURN;
  END IF;
  ctx := coalesce(dba._schema_context(10,10),'');
  prompt := 'Объясни построчно, что делает этот SQL для PostgreSQL. Кратко, по делу, с намёком на индексы если нужно.'
         || E'
Схема (сжато):
' || ctx || E'
SQL:
' || p_sql;
  ans := dba.ai_chat(prompt);
  WHILE length(ans) > 0 LOOP
    chunk := left(ans, 3900); ans := substr(ans, 3901);
    PERFORM dba._tg_reply(p_chat, chunk);
  END LOOP;
END;$$;


--
-- Name: cmd_gpt(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_gpt(p_chat text, p_prompt text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v text; chunk text; BEGIN
  IF coalesce(length(p_prompt),0) < 2 THEN
    PERFORM dba._tg_reply(p_chat, 'Подскажите вопрос после /gpt …'); RETURN;
  END IF;
  v := dba.ai_chat(p_prompt);
  -- chunk to Telegram limit
  WHILE length(v) > 0 LOOP
    chunk := left(v, 3900); v := substr(v, 3901);
    PERFORM dba._tg_reply(p_chat, chunk);
  END LOOP;
END;$$;


--
-- Name: cmd_kill(text, integer); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_kill(p_chat text, p_pid integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE ok boolean; BEGIN
  IF NOT dba._is_admin(p_chat) THEN PERFORM dba._tg_reply(p_chat,'⛔ Только для admin'); RETURN; END IF;
  SELECT pg_terminate_backend(p_pid) INTO ok;
  PERFORM dba._tg_reply(p_chat, CASE WHEN ok THEN '✅ terminated' ELSE '⚠️ не удалось' END||' pid='||p_pid);
END;$$;


--
-- Name: cmd_locks(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_locks(p_chat text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v text; BEGIN
  WITH pairs AS (
    SELECT w.pid waiter, b.pid blocker, now()-w.query_start AS wait_for,
           left(regexp_replace(w.query,'\s+',' ','g'),160) AS wq,
           left(regexp_replace(b.query,'\s+',' ','g'),160) AS bq
    FROM pg_stat_activity w
    JOIN LATERAL unnest(pg_blocking_pids(w.pid)) bp(pid) ON true
    JOIN pg_stat_activity b ON b.pid=bp.pid
    WHERE w.wait_event_type='Lock'
  )
  SELECT string_agg(format('waiter %s %s
  W: %s
  B: %s', waiter, wait_for, wq, bq), E'

') INTO v FROM pairs;
  PERFORM dba._tg_reply(p_chat, coalesce(v,'✅ Блокировок нет'));
END;$$;


--
-- Name: cmd_rls(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_rls(p_chat text, p_tbl text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v text; BEGIN
  WITH p AS (
    SELECT schemaname||'.'||tablename AS tbl, policyname, cmd
    FROM pg_policies
    WHERE (schemaname||'.'||tablename) = p_tbl
    ORDER BY cmd
  )
  SELECT coalesce(string_agg(format('%s — %s', policyname, cmd), E'
'), 'Политик нет или таблица не найдена') INTO v FROM p;
  PERFORM dba._tg_reply(p_chat, '*RLS* '||p_tbl||E'
'||v);
END;$$;


--
-- Name: cmd_size(text, integer); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_size(p_chat text, p_n integer DEFAULT 5) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v text; BEGIN
  WITH t AS (
    SELECT n.nspname||'.'||c.relname AS tbl, pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','m') AND n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY bytes DESC NULLS LAST LIMIT LEAST(GREATEST(coalesce(p_n,5),1),15)
  )
  SELECT string_agg(format('%s — %s', tbl, dba._fmt_bytes(bytes)), E'
') INTO v FROM t;
  PERFORM dba._tg_reply(p_chat, v);
END;$$;


--
-- Name: cmd_sqlgen(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_sqlgen(p_chat text, p_spec text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE ctx text; prompt text; ans text; chunk text; BEGIN
  IF coalesce(length(p_spec),0) < 3 THEN
    PERFORM dba._tg_reply(p_chat, 'Напишите задачу после /sqlgen …'); RETURN;
  END IF;
  ctx := coalesce(dba._schema_context(12,12),'');
  prompt := 'Ты — ассистент по SQL (PostgreSQL). Сгенерируй ТОЛЬКО безопасный SELECT без DML/DDL. '
         || 'Если уместно — добавь LIMIT 100. Используй только реальные таблицы/колонки из контекста ниже. '
         || E'Верни один блок SQL в ```sql ...``` и ничего больше.
'
         || E'Контекст схемы:
' || ctx || E'

Задача: ' || p_spec;
  ans := dba.ai_chat(prompt);
  WHILE length(ans) > 0 LOOP
    chunk := left(ans, 3900); ans := substr(ans, 3901);
    PERFORM dba._tg_reply(p_chat, chunk);
  END LOOP;
END;$$;


--
-- Name: cmd_stat_reset(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_stat_reset(p_chat text) RETURNS void
    LANGUAGE plpgsql
    AS $$ BEGIN
  IF NOT dba._is_admin(p_chat) THEN PERFORM dba._tg_reply(p_chat,'⛔ Только для admin'); RETURN; END IF;
  PERFORM extensions.pg_stat_statements_reset();
  PERFORM dba._tg_reply(p_chat,'✅ pg_stat_statements reset');
END;$$;


--
-- Name: cmd_top(text, integer); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_top(p_chat text, p_n integer DEFAULT 5) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE n int; tot_col text; mean_col text; sql text; r record; msg text; BEGIN
  n := GREATEST(1, LEAST(coalesce(p_n,5), 15));
  -- detect column names depending on pg_stat_statements version
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='extensions' AND table_name='pg_stat_statements' AND column_name='total_exec_time') THEN
    tot_col  := 'total_exec_time';
    mean_col := 'mean_exec_time';
  ELSE
    tot_col  := 'total_time';
    mean_col := 'mean_time';
  END IF;

  sql := format($Q$
    WITH s AS (
      SELECT
        left(regexp_replace(query, '\s+', ' ', 'g'), 220) AS q,
        calls,
        %1$I AS tot,
        COALESCE(%2$I, CASE WHEN calls>0 THEN %1$I/calls END) AS avg
      FROM extensions.pg_stat_statements
      WHERE query NOT ILIKE '/* pgbouncer%%*/%%'
      ORDER BY %1$I DESC NULLS LAST
      LIMIT %3$s
    )
    SELECT row_number() OVER () AS rn, q, calls, tot, avg FROM s
  $Q$, tot_col, mean_col, n::text);

  FOR r IN EXECUTE sql LOOP
    msg := format('#%s avg=~%s ms calls=%s
%s', r.rn, to_char(r.avg::numeric(10,2),'FM999990.00'), r.calls, r.q);
    PERFORM dba._tg_reply(p_chat, msg);
  END LOOP;
END;$_$;


--
-- Name: cmd_vacuum(text, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_vacuum(p_chat text, p_tbl text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE q text; BEGIN
  IF NOT dba._is_admin(p_chat) THEN PERFORM dba._tg_reply(p_chat,'⛔ Только для admin'); RETURN; END IF;
  q := 'VACUUM (ANALYZE, VERBOSE) '||p_tbl; EXECUTE q;
  PERFORM dba._tg_reply(p_chat, '✅ VACUUM OK: '||p_tbl);
END;$$;


--
-- Name: cmd_who(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.cmd_who(p_chat text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v text; BEGIN
  SELECT string_agg(format('%s %s %s', pid, usename, left(regexp_replace(query,'\s+',' ','g'),120)), E'
') INTO v
  FROM pg_stat_activity WHERE state<>'idle' ORDER BY query_start DESC LIMIT 20;
  PERFORM dba._tg_reply(p_chat, coalesce(v,'Пусто.'));
END;$$;


--
-- Name: forward_alerts(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.forward_alerts() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE r RECORD; v_msg text;
BEGIN
  FOR r IN
    SELECT ts, level, kind, details
    FROM dba.alerts
    WHERE sent_at IS NULL         -- ⬅️ убрали level IN (...)
    ORDER BY ts
  LOOP
    v_msg := format('*[%s]* %s\n`%s`\n%s',
                    r.level, r.kind, to_char(r.ts,'YYYY-MM-DD HH24:MI:SS TZ'), r.details);
    PERFORM dba._tg_send(v_msg);
    UPDATE dba.alerts SET sent_at = now()
    WHERE ts = r.ts AND sent_at IS NULL;
  END LOOP;
END; $$;


--
-- Name: http_collect(bigint, boolean); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.http_collect(p_request_id bigint, p_include_headers boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'dba', 'public', 'net'
    AS $$
DECLARE
  v_row  jsonb;
  v_txt  text;
  v_stat int;
BEGIN
  SELECT to_jsonb(net._http_collect_response(p_request_id, p_include_headers))
  INTO v_row;

  IF coalesce(v_row->>'status','') = 'ERROR' THEN
    RAISE EXCEPTION 'pg_net: %', v_row->>'message';
  END IF;

  v_stat := COALESCE((v_row->>'status')::int, (v_row->>'status_code')::int);
  v_txt  := COALESCE(v_row->>'body', v_row->>'content', v_row->>'data', v_row->>'text');

  BEGIN
    RETURN v_txt::jsonb; -- если тело валидный JSON
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
      'status',  v_stat,
      'headers', COALESCE(v_row->'headers', 'null'::jsonb),
      'body',    v_txt,
      'raw',     v_row
    );
  END;
END;
$$;


--
-- Name: http_collect_response_json(bigint, boolean); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.http_collect_response_json(p_request_id bigint, p_include_headers boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'dba', 'public', 'net'
    AS $$
DECLARE
  v_row   jsonb;   -- весь ответ как jsonb (какие бы там ни были ключи)
  v_body  text;
  v_stat  int;
BEGIN
  -- тянем ответ целиком в JSONB
  SELECT to_jsonb(net._http_collect_response(p_request_id, p_include_headers))
  INTO v_row;

  -- нормализуем возможные имена ключей
  v_stat := COALESCE(
              (v_row->>'status')::int,
              (v_row->>'status_code')::int
           );

  v_body := COALESCE(
              v_row->>'body',
              v_row->>'content',
              v_row->>'data',
              v_row->>'text'
           );

  -- если тело — валидный JSON, отдаём его, иначе — аккуратно оборачиваем
  BEGIN
    RETURN v_body::jsonb;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
      'status',  v_stat,
      'headers', COALESCE(v_row->'headers', 'null'::jsonb),
      'body',    v_body,
      'raw',     v_row          -- на всякий случай кладём сырой ответ
    );
  END;
END;
$$;


--
-- Name: http_post_sync(text, jsonb, jsonb, integer, integer); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.http_post_sync(p_url text, p_headers jsonb DEFAULT '{}'::jsonb, p_body jsonb DEFAULT '{}'::jsonb, p_wait_ms integer DEFAULT 5000, p_step_ms integer DEFAULT 200) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'dba', 'public', 'net'
    AS $$
DECLARE
  v_id     bigint;
  v_raw    jsonb;
  v_json   jsonb;
  v_spent  integer := 0;

  v_headers jsonb := COALESCE(p_headers, '{}'::jsonb)
                     || jsonb_build_object(
                          'Accept','application/json',
                          'Content-Type','application/json'
                        );
  v_body    jsonb := COALESCE(p_body, '{}'::jsonb);
BEGIN
  -- ВАЖНО: headers/options не NULL
  v_id := net.http_post(
           p_url,
           v_headers,
           v_body,
           '{}'::jsonb,   -- options не NULL
           0
         );

  LOOP
    BEGIN
      v_raw := to_jsonb(net._http_collect_response(v_id, TRUE));

      IF COALESCE(v_raw->>'status','') = 'ERROR'
         AND position('not found' in lower(COALESCE(v_raw->>'message',''))) > 0
      THEN
        -- ещё не готово: ждём
      ELSE
        BEGIN
          v_json := COALESCE(
            (v_raw->>'body')::jsonb,
            (v_raw->>'content')::jsonb
          );
        EXCEPTION WHEN others THEN
          v_json := jsonb_build_object(
            'status',  COALESCE((v_raw->>'status')::int, (v_raw->>'status_code')::int),
            'headers', v_raw->'headers',
            'body',    COALESCE(v_raw->>'body', v_raw->>'content'),
            'raw',     v_raw
          );
        END;
        RETURN v_json;
      END IF;
    EXCEPTION WHEN others THEN
      -- пробуем ещё раз
    END;

    PERFORM pg_sleep(p_step_ms/1000.0);
    v_spent := v_spent + p_step_ms;
    IF v_spent >= p_wait_ms THEN
      RAISE EXCEPTION 'Timeout waiting pg_net response (id=%)', v_id;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: http_start_request(text, jsonb, text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.http_start_request(p_url text, p_body jsonb, p_auth text DEFAULT NULL::text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id bigint;
BEGIN
  v_id := net.http_post(
    url := p_url,
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type','application/json',
      'Accept','application/json',
      'Authorization', CASE WHEN p_auth IS NOT NULL THEN p_auth END
    )),
    body := p_body
  );
  RETURN v_id;
END;
$$;


--
-- Name: kill_long_queries(interval); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.kill_long_queries(max_age interval) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state='active'
    AND now()-query_start > max_age
    AND pid <> pg_backend_pid()
    AND usename <> 'replication'         -- оставим репликацию
    AND application_name NOT ILIKE '%cron%';
END; $$;


--
-- Name: lock_watchdog(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.lock_watchdog() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v_cnt int; v_msg text; BEGIN
  SELECT count(*) INTO v_cnt
  FROM pg_stat_activity w
  WHERE w.wait_event_type = 'Lock'
    AND array_length(pg_blocking_pids(w.pid),1) IS NOT NULL;
  IF coalesce(v_cnt,0)=0 THEN RETURN; END IF;

  v_msg := '🚨 *Lock wait detected*' || E'
';
  v_msg := v_msg || (
    WITH pairs AS (
      SELECT w.pid       AS waiter_pid,
             b.pid       AS blocker_pid,
             w.usename   AS waiter_user,
             b.usename   AS blocker_user,
             now()-w.query_start AS waiting_for,
             left(regexp_replace(w.query, '\s+', ' ', 'g'), 160) AS waiter_q,
             left(regexp_replace(b.query, '\s+', ' ', 'g'), 160) AS blocker_q
      FROM pg_stat_activity w
      JOIN LATERAL unnest(pg_blocking_pids(w.pid)) AS bp(pid) ON true
      JOIN pg_stat_activity b ON b.pid=bp.pid
      WHERE w.state <> 'idle'
    )
    SELECT string_agg(format('  waiter %s (%s) %s — blocker %s (%s)%s    W: %s%s    B: %s',
                             waiter_pid, waiter_user, waiting_for, blocker_pid, blocker_user, E'
', waiter_q, E'
', blocker_q), E'

')
    FROM pairs
  );
  IF length(v_msg) > 3900 THEN v_msg := left(v_msg, 3900) || E'
…'; END IF;
  PERFORM dba._tg_send(v_msg);
END;$$;


--
-- Name: poll_telegram(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.poll_telegram() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v_token text; v_url text; v_json json; v_offset bigint; r json; upd_id bigint; v_chat text; v_text text; v_cmd text; parts text[];
BEGIN
  SELECT bot_token INTO v_token FROM dba.telegram_settings WHERE id=1 AND enabled;
  IF v_token IS NULL THEN RETURN; END IF;
  SELECT last_update_id INTO v_offset FROM dba.telegram_state WHERE id=1;
  v_url := 'https://api.telegram.org/bot'||v_token||'/getUpdates?timeout=5&offset='||(v_offset+1);
  SELECT (extensions.http_get(v_url)).content::json INTO v_json;
  IF coalesce((v_json->>'ok')::boolean,false) IS FALSE THEN RETURN; END IF;
  FOR r IN SELECT * FROM json_array_elements(coalesce(v_json->'result','[]'::json)) LOOP
    upd_id := (r->>'update_id')::bigint;
    v_chat := r->'message'->'chat'->>'id';
    v_text := coalesce(r->'message'->>'text','');
    IF dba._is_allowed(v_chat) THEN
      parts := regexp_split_to_array(v_text, '\s+');
      v_cmd := lower(coalesce(parts[1],''));
      IF v_cmd = '/start' THEN
        PERFORM dba._tg_reply(v_chat, 'Команды: /ping /echo /top [n] /locks /who /size [n] /rls <s.t> /gpt <вопрос> /sqlgen <тз> /explain <sql> | admin: /kill <pid> /vacuum <s.t> /stat_reset');
      ELSIF v_cmd = '/help' THEN PERFORM dba._tg_reply(v_chat, 'Помощь: /top /locks /who /size /rls /gpt /sqlgen /explain');
      ELSIF v_cmd = '/ping' THEN PERFORM dba._tg_reply(v_chat, 'pong');
      ELSIF v_cmd = '/echo' THEN PERFORM dba._tg_reply(v_chat, substr(v_text,7));
      ELSIF v_cmd = '/top' THEN PERFORM dba.cmd_top(v_chat, NULLIF(parts[2],'')::int);
      ELSIF v_cmd = '/locks' THEN PERFORM dba.cmd_locks(v_chat);
      ELSIF v_cmd = '/who' THEN PERFORM dba.cmd_who(v_chat);
      ELSIF v_cmd = '/size' THEN PERFORM dba.cmd_size(v_chat, NULLIF(parts[2],'')::int);
      ELSIF v_cmd = '/rls' AND array_length(parts,1)>=2 THEN PERFORM dba.cmd_rls(v_chat, parts[2]);
      ELSIF v_cmd = '/stat_reset' THEN PERFORM dba.cmd_stat_reset(v_chat);
      ELSIF v_cmd = '/kill' AND array_length(parts,1)>=2 THEN PERFORM dba.cmd_kill(v_chat, NULLIF(parts[2],'')::int);
      ELSIF v_cmd = '/vacuum' AND array_length(parts,1)>=2 THEN PERFORM dba.cmd_vacuum(v_chat, parts[2]);
      ELSIF v_cmd = '/gpt' THEN PERFORM dba.cmd_gpt(v_chat, trim(substr(v_text, 6)));
      ELSIF v_cmd = '/sqlgen' THEN PERFORM dba.cmd_sqlgen(v_chat, trim(substr(v_text, 9)));
      ELSIF v_cmd = '/explain' THEN PERFORM dba.cmd_explain(v_chat, trim(substr(v_text, 10)));
      END IF;
    END IF;
    IF upd_id > v_offset THEN v_offset := upd_id; END IF;
  END LOOP;
  UPDATE dba.telegram_state SET last_update_id = v_offset WHERE id=1;
END$$;


--
-- Name: refresh_meta_matviews(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.refresh_meta_matviews() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM 1 FROM pg_matviews WHERE schemaname='meta' AND matviewname='tables';
  IF FOUND THEN EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY meta.tables'; END IF;
  PERFORM 1 FROM pg_matviews WHERE schemaname='meta' AND matviewname='columns';
  IF FOUND THEN EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY meta.columns'; END IF;
END;$$;


--
-- Name: send_daily_digest(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.send_daily_digest() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v_enabled boolean; v_chat text; v_msg text := ''; v_sep text := E'\n'; BEGIN
  SELECT enabled, chat_id INTO v_enabled, v_chat FROM dba.telegram_settings WHERE id=1;
  IF NOT coalesce(v_enabled,false) OR v_chat IS NULL THEN RETURN; END IF;
  v_msg := '📊 *Daily DB Digest*' || v_sep || to_char(now(), 'YYYY-MM-DD HH24:MI TZ') || v_sep || v_sep;
  -- top queries
  v_msg := v_msg || '• *Top queries (by total time)*' || v_sep;
  v_msg := v_msg || (
    WITH s AS (
      SELECT left(regexp_replace(query, '\s+', ' ', 'g'), 160) AS q, calls,
             COALESCE(total_exec_time, total_time) AS tot,
             COALESCE(mean_exec_time, mean_time, CASE WHEN calls>0 THEN COALESCE(total_exec_time, total_time)/calls END) AS avg
      FROM extensions.pg_stat_statements
      WHERE query NOT ILIKE '/* pgbouncer%*/%%'
      ORDER BY COALESCE(total_exec_time, total_time) DESC NULLS LAST
      LIMIT 5
    )
    SELECT string_agg(format('  #%s: avg=~%s ms calls=%s', rn, to_char(avg::numeric(10,2),'FM999990.00'), calls) || v_sep || '    ' || q, v_sep)
    FROM (SELECT row_number() OVER () rn, * FROM s) t
  );
  v_msg := v_msg || v_sep || v_sep || '• *Biggest tables*' || v_sep;
  v_msg := v_msg || (
    WITH t AS (
      SELECT n.nspname AS schema, c.relname AS tbl, pg_total_relation_size(c.oid) AS bytes
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind IN ('r','m') AND n.nspname NOT IN ('pg_catalog','information_schema')
      ORDER BY bytes DESC NULLS LAST
      LIMIT 5
    )
    SELECT string_agg(format('  %s.%s — %s', schema, tbl, pg_size_pretty(bytes)), v_sep) FROM t
  );
  v_msg := v_msg || v_sep || v_sep || '• *Dead tuples (top 5)*' || v_sep;
  v_msg := v_msg || (
    WITH t AS (
      SELECT schemaname, relname, n_dead_tup
      FROM pg_stat_user_tables
      ORDER BY n_dead_tup DESC NULLS LAST
      LIMIT 5
    )
    SELECT coalesce(string_agg(format('  %s.%s — dead=%s', schemaname, relname, n_dead_tup), v_sep), '  нет критичных значений') FROM t
  );
  IF length(v_msg) > 3900 THEN v_msg := left(v_msg, 3900) || E'\n…'; END IF;
  PERFORM dba._tg_send(v_msg);
END;$$;


--
-- Name: take_size_snapshot(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.take_size_snapshot() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO dba.snap_sizes(schema, tbl, total_bytes)
  SELECT n.nspname, c.relname, pg_total_relation_size(c.oid)
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema');
END; $$;


--
-- Name: take_snapshot(); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.take_snapshot() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE v_cnt int; v_rows bigint; BEGIN
  INSERT INTO dba.snap_pgss(queryid, calls, total_ms, avg_ms, snippet)
  SELECT queryid, calls, (total_exec_time)::bigint,
         (total_exec_time/calls)::numeric(12,2),
         left(regexp_replace(query, '\s+', ' ', 'g'), 200)
  FROM extensions.pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  ORDER BY total_exec_time DESC LIMIT 15;

  INSERT INTO dba.snap_activity(pid, usename, application_name, client_addr, state, wait_event_type, wait_event, running_for, q)
  SELECT pid, usename, application_name, client_addr, state, wait_event_type, wait_event, now()-query_start,
         left(regexp_replace(query, '\s+', ' ', 'g'), 200)
  FROM pg_stat_activity
  WHERE state='active'
    AND (query ILIKE '%pg_get_tabledef%' OR query ILIKE '%pg_timezone_names%' OR query ILIKE 'with f as (%' OR query ILIKE '%pg_proc%' OR query ILIKE '%pg_class%');

  PERFORM 1 FROM pg_matviews WHERE schemaname='meta' AND matviewname IN ('tables','columns');
  IF FOUND THEN
    SELECT count(*) INTO v_rows FROM meta.tables;
    INSERT INTO dba.snap_matviews(name, ispopulated, rows)
      SELECT 'meta.tables', ispopulated, v_rows FROM pg_matviews WHERE schemaname='meta' AND matviewname='tables';
    SELECT count(*) INTO v_rows FROM meta.columns;
    INSERT INTO dba.snap_matviews(name, ispopulated, rows)
      SELECT 'meta.columns', ispopulated, v_rows FROM pg_matviews WHERE schemaname='meta' AND matviewname='columns';
  END IF;

  INSERT INTO dba.snap_locks(blockers)
  SELECT count(*)
  FROM pg_locks bl
  JOIN pg_locks wl ON bl.locktype = wl.locktype
   AND bl.DATABASE IS NOT DISTINCT FROM wl.DATABASE
   AND bl.relation IS NOT DISTINCT FROM wl.relation
   AND bl.page IS NOT DISTINCT FROM wl.page
   AND bl.tuple IS NOT DISTINCT FROM wl.tuple
   AND bl.virtualxid IS NOT DISTINCT FROM wl.virtualxid
   AND bl.transactionid IS NOT DISTINCT FROM wl.transactionid
   AND bl.classid IS NOT DISTINCT FROM wl.classid
   AND bl.objid IS NOT DISTINCT FROM wl.objid
   AND bl.objsubid IS NOT DISTINCT FROM wl.objsubid
   AND bl.pid != wl.pid
  WHERE NOT bl.GRANTED AND wl.GRANTED;

  SELECT count(*) INTO v_cnt
  FROM pg_policies
  WHERE (qual  ~ '\mauth\.uid\(\)' AND qual  !~ '\(\s*SELECT\s+auth\.uid\(\)')
     OR (with_check ~ '\mauth\.uid\(\)' AND with_check !~ '\(\s*SELECT\s+auth\.uid\(\)');
  IF v_cnt > 0 THEN INSERT INTO dba.alerts(level,kind,details) VALUES ('WARN','RLS_BARE_UID', 'Found '||v_cnt||' policies'); END IF;

  SELECT count(*) INTO v_cnt FROM pg_stat_activity WHERE state='active' AND now()-query_start > interval '60 seconds' AND pid <> pg_backend_pid();
  IF v_cnt > 0 THEN INSERT INTO dba.alerts(level,kind,details) VALUES ('WARN','LONG_RUNNING', 'Active queries > 60s: '||v_cnt); END IF;

  PERFORM 1 FROM pg_matviews WHERE schemaname='meta' AND matviewname='tables' AND NOT ispopulated;
  IF FOUND THEN INSERT INTO dba.alerts(level,kind,details) VALUES ('WARN','META_TABLES_NOT_POPULATED','meta.tables'); END IF;
  PERFORM 1 FROM pg_matviews WHERE schemaname='meta' AND matviewname='columns' AND NOT ispopulated;
  IF FOUND THEN INSERT INTO dba.alerts(level,kind,details) VALUES ('WARN','META_COLUMNS_NOT_POPULATED','meta.columns'); END IF;
END;$$;


--
-- Name: tg_send(text); Type: FUNCTION; Schema: dba; Owner: -
--

CREATE FUNCTION dba.tg_send(msg text) RETURNS void
    LANGUAGE sql
    AS $$ SELECT dba._tg_send(msg) $$;


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
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


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
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


--
-- Name: _mk_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._mk_slug(src text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $_$
  select trim(both '-' from lower(
    regexp_replace(unaccent(coalesce($1,'')), '[^a-zA-Z0-9]+','-','g')
  ))
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: product_reviews_raw; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: add_product_review(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: add_review(bigint, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: admin_set_review_status(uuid, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: apply_stripe_event(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_stripe_event(event jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
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
      'succeeded'
    )
    on conflict (stripe_pi) do update
      set status='succeeded';

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
end $$;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_total numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_total numeric(10,2) DEFAULT 0 NOT NULL,
    grand_total numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    checkout_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    contact_email text GENERATED ALWAYS AS ((checkout_metadata ->> 'contact_email'::text)) STORED,
    metadata_b jsonb GENERATED ALWAYS AS (checkout_metadata) STORED,
    amount_cents bigint,
    payment_intent_id text,
    CONSTRAINT orders_currency_check CHECK ((char_length(currency) = 3)),
    CONSTRAINT orders_metadata_is_object CHECK ((jsonb_typeof(checkout_metadata) = 'object'::text))
);


--
-- Name: create_or_get_pending_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_or_get_pending_order(p_user_id uuid) RETURNS public.orders
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: debug_whoami(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.debug_whoami() RETURNS TABLE(db_role text, jwt_email text, is_admin_flag boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select current_user, auth.jwt()->>'email', public.is_admin();
$$;


--
-- Name: ecom_product_image_versions_set_current(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ecom_product_image_versions_set_current() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: ecomp_set_status_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ecomp_set_status_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: get_my_auth_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_auth_user() RETURNS TABLE(id uuid, email text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'auth', 'public'
    AS $$
  select u.id, u.email
  from auth.users u
  where u.id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: insert_product_impression(text, text, uuid, inet, text, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_product_impression(p_slug text, p_session_id text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_ip inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_referer text DEFAULT NULL::text, p_utm jsonb DEFAULT '{}'::jsonb, p_product_id uuid DEFAULT NULL::uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;


--
-- Name: meta_columns(text[], text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: meta_policies(text[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: meta_tables(text[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: meta_views(text[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: order_allowed_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_allowed_status(p_status text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$ select p_status in ('pending','paid','cancelled','refunded'); $$;


--
-- Name: order_allowed_status(public.order_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_allowed_status(p_status public.order_status) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$ select public.order_allowed_status(p_status::text) $$;


--
-- Name: order_allowed_transition(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_allowed_transition(p_from text, p_to text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: order_allowed_transition(public.order_status, public.order_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_allowed_transition(p_from public.order_status, p_to public.order_status) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$ select public.order_allowed_transition(p_from::text, p_to::text) $$;


--
-- Name: order_validate_transition(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_validate_transition(p_from text, p_to text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: order_validate_transition(public.order_status, public.order_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.order_validate_transition(p_from public.order_status, p_to public.order_status) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$ begin perform public.order_validate_transition(p_from::text, p_to::text); end $$;


--
-- Name: orders_enforce_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.orders_enforce_owner() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: orders_set_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.orders_set_user_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: orders_status_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.orders_status_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'new orders must start as pending';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('paid','cancelled')) OR
      (OLD.status = 'paid'    AND NEW.status = 'refunded')
    ) THEN
      RAISE EXCEPTION 'invalid status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END; $$;


--
-- Name: place_order(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: place_order_with_items(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_order_with_items(payload jsonb) RETURNS TABLE(order_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_order_id uuid;
begin
  -- валидации
  if coalesce((payload->'items')::jsonb, '[]'::jsonb) = '[]'::jsonb then
    raise exception using errcode = 'P0001', message = 'empty_items';
  end if;

  -- вставка заказа
  insert into public.orders(user_id, total) 
  values ((payload->>'user_id')::uuid, (payload->>'total')::numeric)
  returning id into v_order_id;

  -- позиции
  insert into public.order_items(order_id, product_id, qty, price)
  select v_order_id,
         (x->>'product_id')::uuid,
         (x->>'qty')::int,
         (x->>'price')::numeric
  from jsonb_array_elements(payload->'items') as x;

  return query select v_order_id;
end $$;


--
-- Name: place_order_with_items(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: recalc_order_totals(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_order_totals(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: recalc_product_rating(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: refresh_stripe_products_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_stripe_products_cache() RETURNS void
    LANGUAGE sql
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: reject_bad_titles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_bad_titles() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: ecom_products; Type: TABLE; Schema: public; Owner: -
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
    status text DEFAULT 'active'::text NOT NULL,
    sku text NOT NULL,
    image_path text,
    currency text DEFAULT 'EUR'::text,
    CONSTRAINT chk_ecom_products_sku_format CHECK ((sku ~ '^[A-Z0-9][A-Z0-9_-]*$'::text)),
    CONSTRAINT chk_ecom_products_status_allowed CHECK ((status = ANY ('{active,published,archived,draft}'::text[]))),
    CONSTRAINT ecom_products_active_price_ck CHECK (((status <> 'active'::text) OR (price > (0)::numeric))),
    CONSTRAINT ecom_products_currency_check CHECK ((char_length(currency) = 3))
);

ALTER TABLE ONLY public.ecom_products FORCE ROW LEVEL SECURITY;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    price_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    sku text,
    stock integer DEFAULT 0 NOT NULL,
    main_image_url text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating numeric(3,1),
    category_slug text,
    tags jsonb,
    specs jsonb,
    CONSTRAINT products_active_price_ck CHECK (((status <> 'active'::text) OR (price_cents > 0))),
    CONSTRAINT products_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT products_price_nonneg CHECK ((price_cents >= 0)),
    CONSTRAINT products_slug_check CHECK ((slug ~ '^[a-z0-9-]+$'::text)),
    CONSTRAINT products_slug_fmt CHECK ((slug ~ '^[a-z0-9-]+$'::text)),
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text]))),
    CONSTRAINT products_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text]))),
    CONSTRAINT products_stock_check CHECK ((stock >= 0)),
    CONSTRAINT products_stock_nonneg CHECK ((stock >= 0))
);

ALTER TABLE ONLY public.products FORCE ROW LEVEL SECURITY;


--
-- Name: products_unified; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products_unified WITH (security_invoker='true') AS
 SELECT p.id,
    p.slug,
    p.title,
    p.status,
    (p.price)::numeric AS price_amount,
    'USD'::text AS currency,
    (round((p.price * (100)::numeric)))::integer AS price_cents,
    'ecom'::text AS source
   FROM public.ecom_products p
  WHERE (p.status = ANY (ARRAY['active'::text, 'published'::text]))
UNION ALL
 SELECT pr.id,
    pr.slug,
    pr.title,
    pr.status,
    ((pr.price_cents)::numeric / 100.0) AS price_amount,
    pr.currency,
    pr.price_cents,
    'products'::text AS source
   FROM public.products pr
  WHERE (pr.status = 'active'::text);


--
-- Name: search_products(text, text, text, numeric, numeric, text[], integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_products(q text DEFAULT NULL::text, sort_by text DEFAULT 'relevance'::text, sort_dir text DEFAULT 'desc'::text, min_price numeric DEFAULT NULL::numeric, max_price numeric DEFAULT NULL::numeric, statuses text[] DEFAULT ARRAY['active'::text], limit_count integer DEFAULT 20, offset_count integer DEFAULT 0) RETURNS SETOF public.products_unified
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: search_products_v2(text, text, text, numeric, numeric, text[], integer, integer, text[], text[], text[], real); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_products_v2(q text DEFAULT NULL::text, sort_by text DEFAULT 'relevance'::text, sort_dir text DEFAULT 'desc'::text, min_price numeric DEFAULT NULL::numeric, max_price numeric DEFAULT NULL::numeric, statuses text[] DEFAULT ARRAY['active'::text], limit_count integer DEFAULT 20, offset_count integer DEFAULT 0, category_slugs text[] DEFAULT NULL::text[], skus text[] DEFAULT NULL::text[], sources text[] DEFAULT NULL::text[], min_rating real DEFAULT NULL::real) RETURNS SETOF public.products_unified
    LANGUAGE plpgsql STABLE
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: search_products_v2_count(text, numeric, numeric, text[], text[], text[], text[], real); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_products_v2_count(q text DEFAULT NULL::text, min_price numeric DEFAULT NULL::numeric, max_price numeric DEFAULT NULL::numeric, statuses text[] DEFAULT ARRAY['active'::text], category_slugs text[] DEFAULT NULL::text[], skus text[] DEFAULT NULL::text[], sources text[] DEFAULT NULL::text[], min_rating real DEFAULT NULL::real) RETURNS bigint
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
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


--
-- Name: secure_submit_review_unified(text, text, text, smallint, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_current_image_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_current_image_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: set_product_image(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_product_image(p_product_id uuid, p_sku text, p_path text, p_source_url text, p_uploaded_by uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: set_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin new.updated_at := now(); return new; end $$;


--
-- Name: sync_product_image_path(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_product_image_path() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: table_counts_small(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.table_counts_small(max_size_mb integer DEFAULT 50) RETURNS TABLE(schema text, table_name text, exact_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: tr_payments_status_propagate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_payments_status_propagate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: tr_recalc_after_order_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_recalc_after_order_items() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalc_order_totals(NEW.order_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_order_totals(OLD.order_id);
  END IF;
  RETURN NULL;
END$$;


--
-- Name: tr_recalc_after_review_unified(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: trg_orders_block_zero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_orders_block_zero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: trg_orders_forbid_cancel_if_paid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_orders_forbid_cancel_if_paid() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: trg_orders_guard_refund(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_orders_guard_refund() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: trg_orders_log_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_orders_log_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: trg_orders_validate_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_orders_validate_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.order_validate_transition(old.status, new.status);
  end if;
  return new;
end;
$$;


--
-- Name: trg_payments_sync_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_payments_sync_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_from public.order_status;
begin
  if new.order_id is null then return new; end if;

  select o.status into v_from
  from public.orders o
  where o.id = new.order_id
  for update;

  if not found then return new; end if;

  if new.status in ('paid','succeeded') then
    if v_from = 'pending' then
      update public.orders set status='paid' where id=new.order_id;
    end if;
  elsif new.status in ('failed','canceled') then
    if v_from = 'pending' then
      update public.orders set status='cancelled' where id=new.order_id;
    end if;
  end if;

  return new;
end; $$;


--
-- Name: trg_reject_profanity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_reject_profanity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if new.title ~* '(ху[ий]\b|dild|sex|porno)' then
    raise exception 'profanity_blocked' using errcode='P0001';
  end if;
  return new;
end;
$$;


--
-- Name: trg_resolve_impression_pid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_resolve_impression_pid() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  if (new.product_id is null or not exists (select 1 from public.ecom_products where id = new.product_id)) and new.slug is not null then
    select id into new.product_id from public.ecom_products where slug = new.slug limit 1;
    -- если не нашли — остаётся NULL, вставку не ломаем
  end if;
  return new;
end;
$$;


--
-- Name: trg_validate_item_money(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_validate_item_money() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
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


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
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


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
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


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: audit_trigger(); Type: FUNCTION; Schema: sys; Owner: -
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


--
-- Name: gc_webhook_logs(integer); Type: FUNCTION; Schema: sys; Owner: -
--

CREATE FUNCTION sys.gc_webhook_logs(days integer DEFAULT 30) RETURNS void
    LANGUAGE sql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  delete from sys.webhook_logs
  where ts < now() - make_interval(days => days);
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: sys; Owner: -
--

CREATE FUNCTION sys.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'sys', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


--
-- Name: stripe; Type: FOREIGN DATA WRAPPER; Schema: -; Owner: -
--

CREATE FOREIGN DATA WRAPPER stripe HANDLER extensions.stripe_fdw_handler VALIDATOR extensions.stripe_fdw_validator;


--
-- Name: stripe_wrapper; Type: FOREIGN DATA WRAPPER; Schema: -; Owner: -
--

CREATE FOREIGN DATA WRAPPER stripe_wrapper HANDLER extensions.stripe_fdw_handler VALIDATOR extensions.stripe_fdw_validator;


--
-- Name: stripe_server; Type: SERVER; Schema: -; Owner: -
--

CREATE SERVER stripe_server FOREIGN DATA WRAPPER stripe_wrapper OPTIONS (
    api_key_id 'd331e987-4170-495c-9af1-86f05d901ae1',
    api_secret_id '26ce28e0-1d72-41e6-8beb-4a9852d630fc',
    api_url 'https://api.stripe.com/v1/',
    api_version '2024-06-20'
);


--
-- Name: USER MAPPING postgres SERVER stripe_server; Type: USER MAPPING; Schema: -; Owner: -
--

CREATE USER MAPPING FOR postgres SERVER stripe_server OPTIONS (
    api_key_id 'd331e987-4170-495c-9af1-86f05d901ae1',
    api_secret_id '26ce28e0-1d72-41e6-8beb-4a9852d630fc'
);


--
-- Name: USER MAPPING service_role SERVER stripe_server; Type: USER MAPPING; Schema: -; Owner: -
--

CREATE USER MAPPING FOR service_role SERVER stripe_server;


--
-- Name: orders_like; Type: TABLE; Schema: _backup; Owner: -
--

CREATE TABLE _backup.orders_like (
    id uuid,
    user_id uuid,
    status public.order_status,
    subtotal numeric(10,2),
    discount_total numeric(10,2),
    shipping_total numeric(10,2),
    grand_total numeric(10,2),
    currency text,
    created_at timestamp with time zone,
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone
);


--
-- Name: events; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.events (
    id bigint NOT NULL,
    event_type aff.event_type NOT NULL,
    offer_id bigint NOT NULL,
    session_id text,
    ip_hash text,
    user_agent text,
    event_ts timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offer_stats_30d; Type: VIEW; Schema: aff; Owner: -
--

CREATE VIEW aff.offer_stats_30d AS
 WITH base AS (
         SELECT events.offer_id,
            sum(((events.event_type = 'impression'::aff.event_type))::integer) AS impressions,
            sum(((events.event_type = 'click'::aff.event_type))::integer) AS clicks,
            sum(((events.event_type = 'purchase'::aff.event_type))::integer) AS purchases
           FROM archive.events
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


--
-- Name: offers; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.offers (
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


--
-- Name: product_catalog; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.product_catalog (
    product_uid uuid DEFAULT gen_random_uuid() NOT NULL,
    source_schema text NOT NULL,
    source_table text NOT NULL,
    source_pk text NOT NULL,
    title text,
    slug text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_rating_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_rating_stats (
    product_uid uuid NOT NULL,
    avg_rating numeric(3,2) DEFAULT 0 NOT NULL,
    ratings_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offers_with_ratings; Type: VIEW; Schema: aff; Owner: -
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
   FROM ((archive.offers o
     LEFT JOIN archive.product_catalog c ON (((c.source_schema = 'aff'::text) AND (c.source_table = 'offers'::text) AND (c.source_pk = (o.id)::text))))
     LEFT JOIN public.product_rating_stats s ON ((s.product_uid = c.product_uid)));


--
-- Name: sources; Type: TABLE; Schema: aff; Owner: -
--

CREATE TABLE aff.sources (
    id bigint NOT NULL,
    name text NOT NULL,
    base_url text
);


--
-- Name: sources_id_seq; Type: SEQUENCE; Schema: aff; Owner: -
--

CREATE SEQUENCE aff.sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sources_id_seq; Type: SEQUENCE OWNED BY; Schema: aff; Owner: -
--

ALTER SEQUENCE aff.sources_id_seq OWNED BY aff.sources.id;


--
-- Name: ecom_wishlist; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.ecom_wishlist (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: archive; Owner: -
--

CREATE SEQUENCE archive.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: archive; Owner: -
--

ALTER SEQUENCE archive.events_id_seq OWNED BY archive.events.id;


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: archive; Owner: -
--

CREATE SEQUENCE archive.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: archive; Owner: -
--

ALTER SEQUENCE archive.offers_id_seq OWNED BY archive.offers.id;


--
-- Name: product_impressions; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.product_impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: reviews_unified; Type: TABLE; Schema: archive; Owner: -
--

CREATE TABLE archive.reviews_unified (
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


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: ecom_products_20250921_123247; Type: TABLE; Schema: backups; Owner: -
--

CREATE TABLE backups.ecom_products_20250921_123247 (
    id uuid,
    slug text,
    title text,
    price numeric(10,2),
    rating real,
    images jsonb,
    category_slug text,
    tags text[],
    short_desc text,
    specs jsonb,
    created_at timestamp with time zone,
    status text,
    sku text
);


--
-- Name: products_yyyymmdd; Type: TABLE; Schema: backups; Owner: -
--

CREATE TABLE backups.products_yyyymmdd (
    id uuid,
    slug text,
    title text,
    description text,
    price_cents integer,
    currency text,
    sku text,
    stock integer,
    main_image_url text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: product_id_map; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.product_id_map (
    legacy_product_id uuid NOT NULL,
    current_product_id uuid NOT NULL,
    matched_by text
);


--
-- Name: public_product_clicks; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.public_product_clicks (
    id uuid,
    product_id uuid,
    created_at timestamp with time zone,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: public_product_impressions; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.public_product_impressions (
    id uuid,
    product_id uuid,
    created_at timestamp with time zone,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: public_products; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.public_products (
    id uuid,
    slug text,
    title text,
    description text,
    price_cents integer,
    currency text,
    sku text,
    stock integer,
    main_image_url text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    rating numeric(3,1),
    category_slug text,
    tags jsonb,
    specs jsonb
);


--
-- Name: shop_orders; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.shop_orders (
    id bigint,
    customer_id uuid,
    status text,
    subtotal numeric(10,2),
    discount_total numeric(10,2),
    total numeric(10,2),
    currency text,
    created_at timestamp with time zone
);


--
-- Name: shop_products; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.shop_products (
    id uuid,
    slug text,
    title text,
    description text,
    price_cents integer,
    currency text,
    sku text,
    stock integer,
    main_image_url text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: shop_reviews; Type: TABLE; Schema: cleanup_backup; Owner: -
--

CREATE TABLE cleanup_backup.shop_reviews (
    id bigint,
    product_id bigint,
    user_id uuid,
    rating integer,
    title text,
    body text,
    created_at timestamp with time zone,
    status text
);


--
-- Name: ai_settings; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.ai_settings (
    id integer DEFAULT 1 NOT NULL,
    provider text DEFAULT 'openai'::text NOT NULL,
    api_base text DEFAULT 'https://api.openai.com/v1'::text NOT NULL,
    api_key text,
    model text DEFAULT 'gpt-4o-mini'::text NOT NULL,
    system_prompt text DEFAULT 'You are a terse but helpful Postgres/DBA assistant. Answer concisely.'::text NOT NULL
);


--
-- Name: alerts; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.alerts (
    ts timestamp with time zone DEFAULT now(),
    level text,
    kind text,
    details text,
    sent_at timestamp with time zone
);


--
-- Name: bot_acl; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.bot_acl (
    id integer DEFAULT 1 NOT NULL,
    allowed_chat_ids text[] DEFAULT ARRAY[]::text[] NOT NULL,
    admin_chat_ids text[] DEFAULT ARRAY[]::text[] NOT NULL,
    rate_limit_sec integer DEFAULT 2 NOT NULL
);


--
-- Name: snap_activity; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.snap_activity (
    ts timestamp with time zone DEFAULT now(),
    pid integer,
    usename text,
    application_name text,
    client_addr inet,
    state text,
    wait_event_type text,
    wait_event text,
    running_for interval,
    q text
);


--
-- Name: snap_locks; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.snap_locks (
    ts timestamp with time zone DEFAULT now(),
    blockers integer
);


--
-- Name: snap_matviews; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.snap_matviews (
    ts timestamp with time zone DEFAULT now(),
    name text,
    ispopulated boolean,
    rows bigint
);


--
-- Name: snap_pgss; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.snap_pgss (
    ts timestamp with time zone DEFAULT now(),
    queryid bigint,
    calls bigint,
    total_ms bigint,
    avg_ms numeric(12,2),
    snippet text
);


--
-- Name: snap_sizes; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.snap_sizes (
    ts timestamp with time zone DEFAULT now(),
    schema text,
    tbl text,
    total_bytes bigint
);


--
-- Name: telegram_settings; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.telegram_settings (
    id integer DEFAULT 1 NOT NULL,
    bot_token text NOT NULL,
    chat_id text NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: telegram_state; Type: TABLE; Schema: dba; Owner: -
--

CREATE TABLE dba.telegram_state (
    id integer DEFAULT 1 NOT NULL,
    last_update_id bigint DEFAULT 0 NOT NULL
);


--
-- Name: v_activity; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_activity AS
 SELECT ts,
    pid,
    usename,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    running_for,
    q
   FROM dba.snap_activity
  WHERE (ts > (now() - '24:00:00'::interval))
  ORDER BY ts DESC;


--
-- Name: v_alerts; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_alerts AS
 SELECT ts,
    level,
    kind,
    details
   FROM dba.alerts
  WHERE (ts > (now() - '7 days'::interval))
  ORDER BY ts DESC;


--
-- Name: v_cache_io; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_cache_io AS
 SELECT blks_read,
    blks_hit,
    round(((100.0 * (blks_hit)::numeric) / (NULLIF((blks_hit + blks_read), 0))::numeric), 2) AS hit_ratio_pct,
    temp_bytes
   FROM pg_stat_database
  WHERE (datname = current_database());


--
-- Name: v_duplicate_indexes; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_duplicate_indexes AS
 SELECT n.nspname,
    c.relname AS "table",
    i.relname AS idx1,
    j.relname AS idx2
   FROM (((((pg_class i
     JOIN pg_index ix ON ((ix.indexrelid = i.oid)))
     JOIN pg_class j ON (((j.relkind = 'i'::"char") AND (j.oid <> i.oid))))
     JOIN pg_index jx ON (((jx.indexrelid = j.oid) AND (jx.indrelid = ix.indrelid))))
     JOIN pg_class c ON ((c.oid = ix.indrelid)))
     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE ((i.relkind = 'i'::"char") AND (ix.indkey = jx.indkey));


--
-- Name: v_lock_waits; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_lock_waits AS
 SELECT wl.pid AS waiter_pid,
    bl.pid AS blocker_pid,
    wa.usename AS waiter_user,
    ba.usename AS blocker_user,
    wa.application_name AS waiter_app,
    ba.application_name AS blocker_app,
    wl.mode AS waiter_mode,
    bl.mode AS blocker_mode,
    (now() - wa.query_start) AS waiter_running,
    (now() - ba.query_start) AS blocker_running,
    "left"(regexp_replace(wa.query, '\s+'::text, ' '::text, 'g'::text), 200) AS waiter_q,
    "left"(regexp_replace(ba.query, '\s+'::text, ' '::text, 'g'::text), 200) AS blocker_q
   FROM (((pg_locks wl
     JOIN pg_locks bl ON (((wl.locktype = bl.locktype) AND (NOT (wl.database IS DISTINCT FROM bl.database)) AND (NOT (wl.relation IS DISTINCT FROM bl.relation)) AND (NOT (wl.page IS DISTINCT FROM bl.page)) AND (NOT (wl.tuple IS DISTINCT FROM bl.tuple)) AND (NOT (wl.classid IS DISTINCT FROM bl.classid)) AND (NOT (wl.objid IS DISTINCT FROM bl.objid)) AND (NOT (wl.objsubid IS DISTINCT FROM bl.objsubid)) AND (wl.pid <> bl.pid))))
     JOIN pg_stat_activity wa ON ((wa.pid = wl.pid)))
     JOIN pg_stat_activity ba ON ((ba.pid = bl.pid)))
  WHERE ((NOT wl.granted) AND bl.granted);


--
-- Name: v_size_growth; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_size_growth AS
 SELECT schema,
    tbl,
    (max(total_bytes) - min(total_bytes)) AS delta_bytes,
    round(((((max(total_bytes) - min(total_bytes)))::numeric / 1024.0) / 1024.0), 2) AS delta_mb,
    min(ts) AS from_ts,
    max(ts) AS to_ts
   FROM dba.snap_sizes
  WHERE (ts > (now() - '24:00:00'::interval))
  GROUP BY schema, tbl
  ORDER BY (max(total_bytes) - min(total_bytes)) DESC;


--
-- Name: v_top_queries; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_top_queries AS
 SELECT ts,
    queryid,
    calls,
    total_ms,
    avg_ms,
    snippet
   FROM dba.snap_pgss
  WHERE (ts > (now() - '24:00:00'::interval))
  ORDER BY ts DESC, total_ms DESC;


--
-- Name: v_unused_indexes; Type: VIEW; Schema: dba; Owner: -
--

CREATE VIEW dba.v_unused_indexes AS
 SELECT n.nspname,
    c.relname AS "table",
    i.relname AS index,
    s.idx_scan
   FROM ((((pg_class i
     JOIN pg_index ix ON ((ix.indexrelid = i.oid)))
     JOIN pg_stat_all_indexes s ON ((s.indexrelid = i.oid)))
     JOIN pg_class c ON ((c.oid = ix.indrelid)))
     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE ((s.idx_scan = 0) AND (i.relkind = 'i'::"char") AND (c.relkind = ANY (ARRAY['r'::"char", 'p'::"char"])));


--
-- Name: auth_users_mv; Type: MATERIALIZED VIEW; Schema: internal; Owner: -
--

CREATE MATERIALIZED VIEW internal.auth_users_mv AS
 SELECT id,
    email,
    raw_user_meta_data
   FROM auth.users
  WITH NO DATA;


--
-- Name: columns; Type: MATERIALIZED VIEW; Schema: meta; Owner: -
--

CREATE MATERIALIZED VIEW meta.columns AS
 SELECT n.nspname AS schema,
    c.relname AS "table",
    a.attnum AS ordinal,
    a.attname AS "column",
    format_type(a.atttypid, a.atttypmod) AS data_type,
    (NOT a.attnotnull) AS is_nullable,
    col_description(c.oid, (a.attnum)::integer) AS comment
   FROM ((pg_class c
     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
     JOIN pg_attribute a ON ((a.attrelid = c.oid)))
  WHERE ((a.attnum > 0) AND (NOT a.attisdropped) AND (c.relkind = ANY (ARRAY['r'::"char", 'p'::"char"])) AND (n.nspname = ANY (ARRAY['public'::name, 'ecom'::name, 'archive'::name])))
  WITH NO DATA;


--
-- Name: matview_refresh_log; Type: TABLE; Schema: meta; Owner: -
--

CREATE TABLE meta.matview_refresh_log (
    matview_schema text NOT NULL,
    matview_name text NOT NULL,
    last_refresh timestamp with time zone NOT NULL
);


--
-- Name: tables; Type: MATERIALIZED VIEW; Schema: meta; Owner: -
--

CREATE MATERIALIZED VIEW meta.tables AS
 SELECT n.nspname AS schema,
    c.relname AS name,
    c.relkind AS kind,
    pg_total_relation_size((format('%I.%I'::text, n.nspname, c.relname))::regclass) AS bytes,
    obj_description(c.oid) AS comment
   FROM (pg_class c
     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
  WHERE ((c.relkind = ANY (ARRAY['r'::"char", 'p'::"char", 'v'::"char", 'm'::"char"])) AND (n.nspname = ANY (ARRAY['public'::name, 'ecom'::name, 'archive'::name])))
  WITH NO DATA;


--
-- Name: timezones; Type: TABLE; Schema: meta; Owner: -
--

CREATE TABLE meta.timezones (
    name text NOT NULL
);


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: admin_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_emails (
    email text NOT NULL
);

ALTER TABLE ONLY public.admin_emails FORCE ROW LEVEL SECURITY;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor uuid,
    action text NOT NULL,
    entity text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: auth_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_roles (
    role text NOT NULL,
    description text
);


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_login_at timestamp with time zone,
    password_updated_at timestamp with time zone,
    token_version integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone
);

ALTER TABLE ONLY public.auth_users FORCE ROW LEVEL SECURITY;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: clicks; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clicks AS
 SELECT created_at AS ts,
    (product_id)::text AS slug,
    COALESCE(referrer, '-'::text) AS referrer,
    NULL::jsonb AS params
   FROM public.shop_clicks;


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text,
    email text,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_redemptions (
    code text NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: ecom_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecom_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ecom_product_image_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecom_product_image_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text,
    path text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by uuid,
    is_current boolean DEFAULT false NOT NULL,
    source_url text,
    metadata jsonb,
    uploaded_via text
);


--
-- Name: ecom_product_images_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ecom_product_images_latest WITH (security_invoker='on') AS
 SELECT DISTINCT ON (product_id) id,
    product_id,
    path,
    uploaded_at,
    is_current,
    source_url,
    metadata
   FROM public.ecom_product_image_versions v
  ORDER BY product_id, COALESCE(is_current, false) DESC, uploaded_at DESC;


--
-- Name: ecom_products_with_ratings; Type: VIEW; Schema: public; Owner: -
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
     LEFT JOIN archive.product_catalog c ON (((c.source_schema = 'public'::text) AND (c.source_table = 'ecom_products'::text) AND (c.source_pk = (p.id)::text))))
     LEFT JOIN public.product_rating_stats s ON ((s.product_uid = c.product_uid)));


--
-- Name: ecom_wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecom_wishlist (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: impressions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.impressions AS
 SELECT created_at AS ts,
    (product_id)::text AS slug,
    'unknown'::text AS device,
    '-'::text AS lang
   FROM public.shop_impressions;


--
-- Name: line_total_is_generated; Type: TABLE; Schema: public; Owner: -
--

CREATE UNLOGGED TABLE public.line_total_is_generated (
    "coalesce" boolean,
    id bigint NOT NULL
);


--
-- Name: line_total_is_generated_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE UNLOGGED SEQUENCE public.line_total_is_generated_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: line_total_is_generated_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.line_total_is_generated_id_seq OWNED BY public.line_total_is_generated.id;


--
-- Name: offer_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    click_id text,
    target_url text,
    target_url_final text,
    target_host text,
    params jsonb DEFAULT '{}'::jsonb,
    referrer text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
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
    meta jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT chk_order_items_qty_pos CHECK ((qty >= 1)),
    CONSTRAINT order_items_qty_check CHECK ((qty > 0))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: order_history_v; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: order_items_v; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_v2; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.order_v2 WITH (security_invoker='on') AS
 SELECT id,
    user_id,
    created_at,
    (COALESCE(subtotal, (0)::numeric))::numeric(10,2) AS amount_subtotal,
    (COALESCE(discount_total, (0)::numeric))::numeric(10,2) AS amount_discounts,
    (COALESCE(shipping_total, (0)::numeric))::numeric(10,2) AS amount_tax,
    (COALESCE(grand_total, ( SELECT sum(oi.total) AS sum
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)), ((subtotal - discount_total) + shipping_total), (0)::numeric))::numeric(10,2) AS amount_total,
    currency,
    status,
    ( SELECT p.status
           FROM public.payments p
          WHERE (p.order_id = o.id)
          ORDER BY p.created_at DESC
         LIMIT 1) AS payment_status
   FROM public.orders o;


--
-- Name: product_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    user_agent text,
    referrer text,
    session_id text
);


--
-- Name: product_impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    user_agent text,
    referrer text,
    session_id text,
    slug text
);


--
-- Name: product_impressions_30d; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_impressions_30d WITH (security_invoker='true') AS
 SELECT COALESCE((product_id)::text, 'unknown'::text) AS product_key,
    slug,
    date_trunc('day'::text, created_at) AS day,
    count(*) AS impressions
   FROM public.product_impressions
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY COALESCE((product_id)::text, 'unknown'::text), slug, (date_trunc('day'::text, created_at));


--
-- Name: product_reviews; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: product_reviews_admin_v; Type: VIEW; Schema: public; Owner: -
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
   FROM (archive.reviews_unified r
     JOIN archive.product_catalog c ON ((c.product_uid = r.product_uid)));


--
-- Name: products_unified_dedup; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products_unified_dedup WITH (security_invoker='true') AS
 WITH unioned AS (
         SELECT p.id,
            p.slug,
            p.title,
            p.status,
            (p.price)::numeric AS price_amount,
            'USD'::text AS currency,
            (round((p.price * (100)::numeric)))::integer AS price_cents,
            'ecom'::text AS source,
            COALESCE(p.created_at, now()) AS created_at,
            1 AS source_priority,
            p.category_slug,
            p.sku,
            ARRAY( SELECT unnest(COALESCE(p.tags, ARRAY[]::text[])) AS unnest) AS tags_text,
            p.rating
           FROM public.ecom_products p
          WHERE (p.status = ANY (ARRAY['active'::text, 'published'::text]))
        UNION ALL
         SELECT pr.id,
            pr.slug,
            pr.title,
            pr.status,
            ((pr.price_cents)::numeric / 100.0) AS price_amount,
            pr.currency,
            pr.price_cents,
            'products'::text AS source,
            COALESCE(pr.created_at, now()) AS created_at,
            2 AS source_priority,
            pr.category_slug,
            pr.sku,
            COALESCE(ARRAY( SELECT jsonb_array_elements_text(pr.tags) AS jsonb_array_elements_text), ARRAY[]::text[]) AS tags_text,
            (pr.rating)::real AS rating
           FROM public.products pr
          WHERE (pr.status = 'active'::text)
        ), ranked AS (
         SELECT u.id,
            u.slug,
            u.title,
            u.status,
            u.price_amount,
            u.currency,
            u.price_cents,
            u.source,
            u.created_at,
            u.source_priority,
            u.category_slug,
            u.sku,
            u.tags_text,
            u.rating,
            row_number() OVER (PARTITION BY u.slug ORDER BY u.source_priority, u.price_amount, u.created_at DESC, u.id) AS rn
           FROM unioned u
        )
 SELECT id,
    slug,
    title,
    status,
    price_amount,
    currency,
    price_cents,
    source,
    category_slug,
    sku,
    tags_text,
    rating
   FROM ranked
  WHERE (rn = 1);


--
-- Name: products_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products_v WITH (security_invoker='on') AS
 SELECT slug,
    main_image_url AS image_path,
    updated_at
   FROM public.products
  WHERE (status = 'active'::text);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    full_name text,
    avatar_url text,
    website text,
    CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    token_hash text NOT NULL,
    user_agent text,
    ip_address inet,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason text,
    updated_at timestamp with time zone,
    CONSTRAINT refresh_tokens_expires_check CHECK ((expires_at > created_at))
);

ALTER TABLE ONLY public.refresh_tokens FORCE ROW LEVEL SECURITY;


--
-- Name: review_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_rate_limits (
    ip_hash text NOT NULL,
    last_at timestamp with time zone DEFAULT now() NOT NULL,
    count_24h integer DEFAULT 0 NOT NULL,
    user_id uuid
);


--
-- Name: reviews__backup_20250909_181553; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.settings FORCE ROW LEVEL SECURITY;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    carrier text,
    tracking_number text,
    status text DEFAULT 'ready'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_balance_transactions_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_balance_transactions_cache (
    id text NOT NULL,
    amount bigint,
    currency text,
    fee bigint,
    net bigint,
    status text,
    type text,
    created timestamp with time zone,
    attrs jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_charges_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_charges_cache (
    id text NOT NULL,
    customer text,
    amount bigint,
    currency text,
    description text,
    invoice text,
    payment_intent text,
    status text,
    created timestamp without time zone,
    email text,
    name text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_customers_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_customers_cache (
    id text NOT NULL,
    email text,
    name text,
    description text,
    created timestamp without time zone,
    attrs jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_customers_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_customers_map (
    user_id uuid NOT NULL,
    stripe_customer_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_products_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_products_cache (
    id text NOT NULL,
    name text,
    active boolean,
    default_price text,
    description text,
    created timestamp without time zone,
    updated timestamp without time zone,
    attrs jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_public boolean DEFAULT true
);


--
-- Name: stripe_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhooks (
    id text NOT NULL,
    type text NOT NULL,
    livemode boolean NOT NULL,
    api_version text,
    created_utc timestamp with time zone NOT NULL,
    data jsonb NOT NULL,
    raw jsonb,
    inserted_at timestamp with time zone DEFAULT now(),
    mode text GENERATED ALWAYS AS (
CASE
    WHEN livemode THEN 'live'::text
    ELSE 'test'::text
END) STORED
);


--
-- Name: stripe_webhooks_failed; Type: TABLE; Schema: public; Owner: -
--

CREATE UNLOGGED TABLE public.stripe_webhooks_failed (
    id text NOT NULL,
    type text,
    livemode boolean,
    api_version text,
    created_utc timestamp with time zone,
    data jsonb,
    raw jsonb,
    inserted_at timestamp with time zone,
    surrogate_id bigint NOT NULL
);


--
-- Name: stripe_webhooks_failed_surrogate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE UNLOGGED SEQUENCE public.stripe_webhooks_failed_surrogate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stripe_webhooks_failed_surrogate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stripe_webhooks_failed_surrogate_id_seq OWNED BY public.stripe_webhooks_failed.surrogate_id;


--
-- Name: stripe_webhooks_with_mode; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stripe_webhooks_with_mode WITH (security_invoker='on') AS
 SELECT id,
    type,
    livemode,
        CASE
            WHEN livemode THEN 'live'::text
            ELSE 'test'::text
        END AS mode,
    created_utc,
    data
   FROM public.stripe_webhooks;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    stripe_customer text,
    stripe_subscription text,
    plan text,
    status text,
    current_period_end timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: title_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.title_blacklist (
    pattern text NOT NULL
);


--
-- Name: total_is_generated; Type: TABLE; Schema: public; Owner: -
--

CREATE UNLOGGED TABLE public.total_is_generated (
    "coalesce" boolean,
    id bigint NOT NULL
);


--
-- Name: total_is_generated_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE UNLOGGED SEQUENCE public.total_is_generated_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: total_is_generated_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.total_is_generated_id_seq OWNED BY public.total_is_generated.id;


--
-- Name: webhook_logs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.webhook_logs AS
 SELECT sw.id,
    sw.created_utc AS created_at,
    sw.type,
    COALESCE(sw.data, sw.raw) AS payload,
    NULL::text AS event,
    NULL::text AS url,
    NULL::integer AS status,
    NULL::jsonb AS request_headers,
    NULL::jsonb AS request_body,
    NULL::jsonb AS response_headers,
    NULL::jsonb AS response_body,
    NULL::text AS error,
    NULL::integer AS duration_ms,
    1 AS attempt,
    sw.id AS delivery_id,
    NULL::text AS webhook_id,
    'ok'::text AS source,
        CASE
            WHEN sw.livemode THEN 'live'::text
            ELSE 'test'::text
        END AS webhook_mode,
    sw.livemode,
    sw.api_version,
    sw.inserted_at
   FROM public.stripe_webhooks sw
UNION ALL
 SELECT swf.id,
    swf.created_utc AS created_at,
    swf.type,
    COALESCE(swf.data, swf.raw) AS payload,
    NULL::text AS event,
    NULL::text AS url,
    NULL::integer AS status,
    NULL::jsonb AS request_headers,
    NULL::jsonb AS request_body,
    NULL::jsonb AS response_headers,
    NULL::jsonb AS response_body,
    NULL::text AS error,
    NULL::integer AS duration_ms,
    1 AS attempt,
    swf.id AS delivery_id,
    NULL::text AS webhook_id,
    'failed'::text AS source,
        CASE
            WHEN swf.livemode THEN 'live'::text
            ELSE 'test'::text
        END AS webhook_mode,
    swf.livemode,
    swf.api_version,
    swf.inserted_at
   FROM public.stripe_webhooks_failed swf;


--
-- Name: zz_probe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zz_probe (
    id integer NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
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


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
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


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
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
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
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


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
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


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
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


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
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


--
-- Name: accounts; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.accounts (
    id text,
    business_type text,
    country text,
    email text,
    type text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'accounts',
    rowid_column 'id'
);


--
-- Name: balance; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.balance (
    balance_type text,
    amount bigint,
    currency text,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'balance',
    rowid_column 'id'
);


--
-- Name: balance_transactions; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.balance_transactions (
    id text,
    amount bigint,
    currency text,
    description text,
    fee bigint,
    net bigint,
    status text,
    type text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'balance_transactions',
    rowid_column 'id'
);


--
-- Name: charges; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.charges (
    id text,
    amount bigint,
    currency text,
    customer text,
    description text,
    invoice text,
    payment_intent text,
    status text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'charges',
    rowid_column 'id'
);


--
-- Name: checkout_sessions; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.checkout_sessions (
    id text,
    customer text,
    payment_intent text,
    subscription text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'checkout/sessions',
    rowid_column 'id'
);


--
-- Name: customers; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.customers (
    id text,
    email text,
    name text,
    description text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'customers',
    rowid_column 'id'
);


--
-- Name: payment_intents; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.payment_intents (
    id text,
    customer text,
    amount bigint,
    currency text,
    payment_method text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'payment_intents',
    rowid_column 'id'
);


--
-- Name: payouts; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.payouts (
    id text,
    amount bigint,
    currency text,
    arrival_date timestamp without time zone,
    description text,
    statement_descriptor text,
    status text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'payouts',
    rowid_column 'id'
);


--
-- Name: prices; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.prices (
    id text,
    active boolean,
    currency text,
    product text,
    unit_amount bigint,
    type text,
    created timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'prices',
    rowid_column 'id'
);


--
-- Name: products; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.products (
    id text,
    name text,
    active boolean,
    default_price text,
    description text,
    created timestamp without time zone,
    updated timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'products',
    rowid_column 'id'
);


--
-- Name: subscriptions; Type: FOREIGN TABLE; Schema: stripe; Owner: -
--

CREATE FOREIGN TABLE stripe.subscriptions (
    id text,
    customer text,
    currency text,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    attrs jsonb
)
SERVER stripe_server
OPTIONS (
    object 'subscriptions',
    rowid_column 'id'
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: sys; Owner: -
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


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: sys; Owner: -
--

CREATE SEQUENCE sys.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: sys; Owner: -
--

ALTER SEQUENCE sys.audit_log_id_seq OWNED BY sys.audit_log.id;


--
-- Name: settings; Type: TABLE; Schema: sys; Owner: -
--

CREATE TABLE sys.settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_logs; Type: TABLE; Schema: sys; Owner: -
--

CREATE TABLE sys.webhook_logs (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    status integer NOT NULL,
    payload jsonb,
    response jsonb
);


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE; Schema: sys; Owner: -
--

CREATE SEQUENCE sys.webhook_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: sys; Owner: -
--

ALTER SEQUENCE sys.webhook_logs_id_seq OWNED BY sys.webhook_logs.id;


--
-- Name: sources id; Type: DEFAULT; Schema: aff; Owner: -
--

ALTER TABLE ONLY aff.sources ALTER COLUMN id SET DEFAULT nextval('aff.sources_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.events ALTER COLUMN id SET DEFAULT nextval('archive.events_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.offers ALTER COLUMN id SET DEFAULT nextval('archive.offers_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: line_total_is_generated id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_total_is_generated ALTER COLUMN id SET DEFAULT nextval('public.line_total_is_generated_id_seq'::regclass);


--
-- Name: stripe_webhooks_failed surrogate_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks_failed ALTER COLUMN surrogate_id SET DEFAULT nextval('public.stripe_webhooks_failed_surrogate_id_seq'::regclass);


--
-- Name: total_is_generated id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.total_is_generated ALTER COLUMN id SET DEFAULT nextval('public.total_is_generated_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: sys; Owner: -
--

ALTER TABLE ONLY sys.audit_log ALTER COLUMN id SET DEFAULT nextval('sys.audit_log_id_seq'::regclass);


--
-- Name: webhook_logs id; Type: DEFAULT; Schema: sys; Owner: -
--

ALTER TABLE ONLY sys.webhook_logs ALTER COLUMN id SET DEFAULT nextval('sys.webhook_logs_id_seq'::regclass);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: aff; Owner: -
--

ALTER TABLE ONLY aff.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: ecom_wishlist ecom_wishlist_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.ecom_wishlist
    ADD CONSTRAINT ecom_wishlist_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: offers offers_slug_key; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.offers
    ADD CONSTRAINT offers_slug_key UNIQUE (slug);


--
-- Name: product_catalog product_catalog_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.product_catalog
    ADD CONSTRAINT product_catalog_pkey PRIMARY KEY (product_uid);


--
-- Name: product_catalog product_catalog_source_schema_source_table_source_pk_key; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.product_catalog
    ADD CONSTRAINT product_catalog_source_schema_source_table_source_pk_key UNIQUE (source_schema, source_table, source_pk);


--
-- Name: product_impressions product_impressions_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.product_impressions
    ADD CONSTRAINT product_impressions_pkey PRIMARY KEY (id);


--
-- Name: reviews_unified reviews_unified_pkey; Type: CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.reviews_unified
    ADD CONSTRAINT reviews_unified_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: product_id_map product_id_map_pkey; Type: CONSTRAINT; Schema: cleanup_backup; Owner: -
--

ALTER TABLE ONLY cleanup_backup.product_id_map
    ADD CONSTRAINT product_id_map_pkey PRIMARY KEY (legacy_product_id);


--
-- Name: ai_settings ai_settings_pkey; Type: CONSTRAINT; Schema: dba; Owner: -
--

ALTER TABLE ONLY dba.ai_settings
    ADD CONSTRAINT ai_settings_pkey PRIMARY KEY (id);


--
-- Name: bot_acl bot_acl_pkey; Type: CONSTRAINT; Schema: dba; Owner: -
--

ALTER TABLE ONLY dba.bot_acl
    ADD CONSTRAINT bot_acl_pkey PRIMARY KEY (id);


--
-- Name: telegram_settings telegram_settings_pkey; Type: CONSTRAINT; Schema: dba; Owner: -
--

ALTER TABLE ONLY dba.telegram_settings
    ADD CONSTRAINT telegram_settings_pkey PRIMARY KEY (id);


--
-- Name: telegram_state telegram_state_pkey; Type: CONSTRAINT; Schema: dba; Owner: -
--

ALTER TABLE ONLY dba.telegram_state
    ADD CONSTRAINT telegram_state_pkey PRIMARY KEY (id);


--
-- Name: matview_refresh_log matview_refresh_log_pkey; Type: CONSTRAINT; Schema: meta; Owner: -
--

ALTER TABLE ONLY meta.matview_refresh_log
    ADD CONSTRAINT matview_refresh_log_pkey PRIMARY KEY (matview_schema, matview_name);


--
-- Name: timezones timezones_pkey; Type: CONSTRAINT; Schema: meta; Owner: -
--

ALTER TABLE ONLY meta.timezones
    ADD CONSTRAINT timezones_pkey PRIMARY KEY (name);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: admin_emails admin_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_pkey PRIMARY KEY (email);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: auth_roles auth_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_roles
    ADD CONSTRAINT auth_roles_pkey PRIMARY KEY (role);


--
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (code, user_id, redeemed_at);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (code);


--
-- Name: ecom_categories ecom_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_categories
    ADD CONSTRAINT ecom_categories_pkey PRIMARY KEY (id);


--
-- Name: ecom_categories ecom_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_categories
    ADD CONSTRAINT ecom_categories_slug_key UNIQUE (slug);


--
-- Name: ecom_product_image_versions ecom_product_image_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_product_image_versions
    ADD CONSTRAINT ecom_product_image_versions_pkey PRIMARY KEY (id);


--
-- Name: ecom_products ecom_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_pkey PRIMARY KEY (id);


--
-- Name: ecom_products ecom_products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_slug_key UNIQUE (slug);


--
-- Name: ecom_wishlist ecom_wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_wishlist
    ADD CONSTRAINT ecom_wishlist_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: line_total_is_generated line_total_is_generated_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_total_is_generated
    ADD CONSTRAINT line_total_is_generated_pkey PRIMARY KEY (id);


--
-- Name: offer_clicks offer_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_clicks
    ADD CONSTRAINT offer_clicks_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_clicks product_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_clicks
    ADD CONSTRAINT product_clicks_pkey PRIMARY KEY (id);


--
-- Name: product_impressions product_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_impressions
    ADD CONSTRAINT product_impressions_pkey PRIMARY KEY (id);


--
-- Name: product_rating_stats product_rating_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rating_stats
    ADD CONSTRAINT product_rating_stats_pkey PRIMARY KEY (product_uid);


--
-- Name: product_reviews_raw product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (product_id, user_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: review_rate_limits review_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_rate_limits
    ADD CONSTRAINT review_rate_limits_pkey PRIMARY KEY (ip_hash);


--
-- Name: reviews__backup_20250909_181553 reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey1 PRIMARY KEY (product_id, user_id);


--
-- Name: reviews__backup_20250909_181553 reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shop_clicks shop_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_clicks
    ADD CONSTRAINT shop_clicks_pkey PRIMARY KEY (id);


--
-- Name: shop_impressions shop_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_impressions
    ADD CONSTRAINT shop_impressions_pkey PRIMARY KEY (id);


--
-- Name: stripe_balance_transactions_cache stripe_balance_transactions_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_balance_transactions_cache
    ADD CONSTRAINT stripe_balance_transactions_cache_pkey PRIMARY KEY (id);


--
-- Name: stripe_charges_cache stripe_charges_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_charges_cache
    ADD CONSTRAINT stripe_charges_cache_pkey PRIMARY KEY (id);


--
-- Name: stripe_customers_cache stripe_customers_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers_cache
    ADD CONSTRAINT stripe_customers_cache_pkey PRIMARY KEY (id);


--
-- Name: stripe_customers_map stripe_customers_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers_map
    ADD CONSTRAINT stripe_customers_map_pkey PRIMARY KEY (user_id);


--
-- Name: stripe_customers_map stripe_customers_map_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers_map
    ADD CONSTRAINT stripe_customers_map_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: stripe_products_cache stripe_products_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_products_cache
    ADD CONSTRAINT stripe_products_cache_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhooks_failed stripe_webhooks_failed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks_failed
    ADD CONSTRAINT stripe_webhooks_failed_id_key UNIQUE (id);


--
-- Name: stripe_webhooks_failed stripe_webhooks_failed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks_failed
    ADD CONSTRAINT stripe_webhooks_failed_pkey PRIMARY KEY (surrogate_id);


--
-- Name: stripe_webhooks stripe_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks
    ADD CONSTRAINT stripe_webhooks_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_key UNIQUE (stripe_subscription);


--
-- Name: title_blacklist title_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.title_blacklist
    ADD CONSTRAINT title_blacklist_pkey PRIMARY KEY (pattern);


--
-- Name: total_is_generated total_is_generated_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.total_is_generated
    ADD CONSTRAINT total_is_generated_pkey PRIMARY KEY (id);


--
-- Name: zz_probe zz_probe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zz_probe
    ADD CONSTRAINT zz_probe_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: sys; Owner: -
--

ALTER TABLE ONLY sys.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: sys; Owner: -
--

ALTER TABLE ONLY sys.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: sys; Owner: -
--

ALTER TABLE ONLY sys.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: aff_events_by_type_time; Type: INDEX; Schema: archive; Owner: -
--

CREATE INDEX aff_events_by_type_time ON archive.events USING btree (event_ts) WHERE (event_type = 'click'::aff.event_type);


--
-- Name: idx_ecom_wishlist_product_id; Type: INDEX; Schema: archive; Owner: -
--

CREATE INDEX idx_ecom_wishlist_product_id ON archive.ecom_wishlist USING btree (product_id);


--
-- Name: idx_events_offer_id; Type: INDEX; Schema: archive; Owner: -
--

CREATE INDEX idx_events_offer_id ON archive.events USING btree (offer_id);


--
-- Name: idx_offers_source_id; Type: INDEX; Schema: archive; Owner: -
--

CREATE INDEX idx_offers_source_id ON archive.offers USING btree (source_id);


--
-- Name: idx_reviews_unified_product; Type: INDEX; Schema: archive; Owner: -
--

CREATE INDEX idx_reviews_unified_product ON archive.reviews_unified USING btree (product_uid);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_clients_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_product_id_map_current_product_id; Type: INDEX; Schema: cleanup_backup; Owner: -
--

CREATE INDEX idx_product_id_map_current_product_id ON cleanup_backup.product_id_map USING btree (current_product_id);


--
-- Name: auth_users_mv_id_idx; Type: INDEX; Schema: internal; Owner: -
--

CREATE UNIQUE INDEX auth_users_mv_id_idx ON internal.auth_users_mv USING btree (id);


--
-- Name: idx_meta_columns_schema_table; Type: INDEX; Schema: meta; Owner: -
--

CREATE INDEX idx_meta_columns_schema_table ON meta.columns USING btree (schema, "table");


--
-- Name: idx_meta_tables_schema_name; Type: INDEX; Schema: meta; Owner: -
--

CREATE INDEX idx_meta_tables_schema_name ON meta.tables USING btree (schema, name);


--
-- Name: meta_columns_uq; Type: INDEX; Schema: meta; Owner: -
--

CREATE UNIQUE INDEX meta_columns_uq ON meta.columns USING btree (schema, "table", ordinal);


--
-- Name: meta_tables_uq; Type: INDEX; Schema: meta; Owner: -
--

CREATE UNIQUE INDEX meta_tables_uq ON meta.tables USING btree (schema, name);


--
-- Name: audit_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_created_idx ON public.audit_log USING btree (created_at DESC);


--
-- Name: cart_items_unique_no_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_items_unique_no_variant ON public.cart_items USING btree (cart_id, product_id) WHERE (variant_id IS NULL);


--
-- Name: ecom_piv_product_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_piv_product_created_idx ON public.ecom_product_image_versions USING btree (product_id, uploaded_at DESC);


--
-- Name: ecom_products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_category_idx ON public.ecom_products USING btree (category_slug);


--
-- Name: ecom_products_price_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_price_idx ON public.ecom_products USING btree (price);


--
-- Name: ecom_products_rating_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_rating_idx ON public.ecom_products USING btree (rating);


--
-- Name: ecom_products_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_slug_idx ON public.ecom_products USING btree (slug);


--
-- Name: ecom_products_slug_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_slug_trgm ON public.ecom_products USING gin (slug extensions.gin_trgm_ops);


--
-- Name: ecom_products_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_status_idx ON public.ecom_products USING btree (status);


--
-- Name: ecom_products_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ecom_products_title_trgm ON public.ecom_products USING gin (title extensions.gin_trgm_ops);


--
-- Name: idx_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_user_id ON public.addresses USING btree (user_id);


--
-- Name: idx_auth_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_is_active ON public.auth_users USING btree (is_active);


--
-- Name: idx_auth_users_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_metadata_gin ON public.auth_users USING gin (metadata);


--
-- Name: idx_auth_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_role ON public.auth_users USING btree (role);


--
-- Name: idx_auth_users_token_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_token_ver ON public.auth_users USING btree (token_version);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_cart_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cart_items_cart_product ON public.cart_items USING btree (cart_id, product_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_carts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_user ON public.carts USING btree (user_id);


--
-- Name: idx_coupon_redemptions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_redemptions_order_id ON public.coupon_redemptions USING btree (order_id);


--
-- Name: idx_coupon_redemptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_redemptions_user_id ON public.coupon_redemptions USING btree (user_id);


--
-- Name: idx_ecom_product_image_versions_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecom_product_image_versions_product_id ON public.ecom_product_image_versions USING btree (product_id);


--
-- Name: idx_ecom_products_specs_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecom_products_specs_brand ON public.ecom_products USING btree (((specs ->> 'brand'::text)));


--
-- Name: idx_ecom_products_specs_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecom_products_specs_gin ON public.ecom_products USING gin (specs);


--
-- Name: idx_epiv_product_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epiv_product_current ON public.ecom_product_image_versions USING btree (product_id, is_current);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_created_at ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_product_clicks_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_clicks_product_id ON public.product_clicks USING btree (product_id);


--
-- Name: idx_product_impressions_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_impressions_product_id ON public.product_impressions USING btree (product_id);


--
-- Name: idx_product_reviews_raw_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_raw_user_id ON public.product_reviews_raw USING btree (user_id);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_shipments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_order_id ON public.shipments USING btree (order_id);


--
-- Name: idx_sw_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sw_created ON public.stripe_webhooks USING btree (created_utc);


--
-- Name: ix_payments_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payments_status_created ON public.payments USING btree (status, created_at DESC);


--
-- Name: offer_clicks_slug_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offer_clicks_slug_created_idx ON public.offer_clicks USING btree (slug, created_at DESC);


--
-- Name: order_status_history_order_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_status_history_order_created_idx ON public.order_status_history USING btree (order_id, created_at DESC);


--
-- Name: orders_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_created_at_idx ON public.orders USING btree (created_at);


--
-- Name: orders_payment_intent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_payment_intent_id_idx ON public.orders USING btree (payment_intent_id);


--
-- Name: orders_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pending_idx ON public.orders USING btree (user_id) WHERE (status = 'pending'::public.order_status);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: orders_user_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_status_created_idx ON public.orders USING btree (user_id, status, created_at DESC);


--
-- Name: payments_order_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_order_created_idx ON public.payments USING btree (order_id, created_at DESC);


--
-- Name: payments_provider_ref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_provider_ref_idx ON public.payments USING btree (provider_ref);


--
-- Name: product_impressions_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_impressions_created_idx ON public.product_impressions USING btree (created_at DESC);


--
-- Name: product_impressions_product_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_impressions_product_created_idx ON public.product_impressions USING btree (product_id, created_at DESC);


--
-- Name: product_impressions_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_impressions_product_idx ON public.product_impressions USING btree (product_id);


--
-- Name: product_impressions_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_impressions_slug_idx ON public.product_impressions USING btree (slug);


--
-- Name: products_active_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_active_updated_idx ON public.products USING btree (updated_at DESC) WHERE (status = 'active'::text);


--
-- Name: products_slug_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_slug_trgm ON public.products USING gin (slug extensions.gin_trgm_ops);


--
-- Name: products_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_title_trgm ON public.products USING gin (title extensions.gin_trgm_ops);


--
-- Name: shop_clicks_product_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_clicks_product_created_idx ON public.shop_clicks USING btree (product_id, created_at DESC);


--
-- Name: shop_impressions_product_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_impressions_product_created_idx ON public.shop_impressions USING btree (product_id, created_at DESC);


--
-- Name: stripe_webhooks_failed_created_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stripe_webhooks_failed_created_brin ON public.stripe_webhooks_failed USING brin (created_utc);


--
-- Name: stripe_webhooks_failed_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stripe_webhooks_failed_created_idx ON public.stripe_webhooks_failed USING btree (created_utc);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: reviews_unified trg_reviews_unified_recalc; Type: TRIGGER; Schema: archive; Owner: -
--

CREATE TRIGGER trg_reviews_unified_recalc AFTER INSERT OR DELETE OR UPDATE ON archive.reviews_unified FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_after_review_unified();


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: stripe_products_cache _upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER _upd BEFORE UPDATE ON public.stripe_products_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ecom_products ecomp_set_status_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ecomp_set_status_on_insert BEFORE INSERT ON public.ecom_products FOR EACH ROW EXECUTE FUNCTION public.ecomp_set_status_on_insert();


--
-- Name: orders orders_block_zero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_block_zero BEFORE INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_orders_block_zero();


--
-- Name: orders orders_forbid_cancel_if_paid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_forbid_cancel_if_paid BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_orders_forbid_cancel_if_paid();


--
-- Name: orders orders_guard_refund; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_guard_refund BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_orders_guard_refund();


--
-- Name: orders orders_log_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_log_status AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_orders_log_status();


--
-- Name: orders orders_validate_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_validate_status BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_orders_validate_status();


--
-- Name: payments payments_sync_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_sync_order AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trg_payments_sync_order();


--
-- Name: order_items reject_profanity_order_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reject_profanity_order_items BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trg_reject_profanity();


--
-- Name: product_impressions tr_product_impressions_resolve_pid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_product_impressions_resolve_pid BEFORE INSERT OR UPDATE ON public.product_impressions FOR EACH ROW EXECUTE FUNCTION public.trg_resolve_impression_pid();


--
-- Name: auth_users trg_auth_users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auth_users_set_updated_at BEFORE UPDATE ON public.auth_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: order_items trg_order_items_recalc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_order_items_recalc AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_after_order_items();


--
-- Name: orders trg_orders_enforce_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_enforce_owner BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_enforce_owner();


--
-- Name: orders trg_orders_set_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_set_user_id BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_set_user_id();


--
-- Name: orders trg_orders_status_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_status_guard BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_status_guard();


--
-- Name: payments trg_payments_status_propagate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payments_status_propagate AFTER UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tr_payments_status_propagate();


--
-- Name: product_reviews_raw trg_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews_raw FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ecom_products trg_reject_bad_titles_ecom; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reject_bad_titles_ecom BEFORE INSERT OR UPDATE ON public.ecom_products FOR EACH ROW EXECUTE FUNCTION public.reject_bad_titles();


--
-- Name: products trg_reject_bad_titles_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reject_bad_titles_products BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.reject_bad_titles();


--
-- Name: reviews trg_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: settings trg_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_settings_updated_at();


--
-- Name: order_items validate_item_money; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_item_money BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trg_validate_item_money();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: settings _settings_touch; Type: TRIGGER; Schema: sys; Owner: -
--

CREATE TRIGGER _settings_touch BEFORE UPDATE ON sys.settings FOR EACH ROW EXECUTE FUNCTION sys.touch_updated_at();


--
-- Name: ecom_wishlist ecom_wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.ecom_wishlist
    ADD CONSTRAINT ecom_wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: events events_offer_id_fkey; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.events
    ADD CONSTRAINT events_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES archive.offers(id) ON DELETE CASCADE;


--
-- Name: product_catalog fk_product_catalog_product; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.product_catalog
    ADD CONSTRAINT fk_product_catalog_product FOREIGN KEY (product_uid) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: offers offers_source_id_fkey; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.offers
    ADD CONSTRAINT offers_source_id_fkey FOREIGN KEY (source_id) REFERENCES aff.sources(id) ON DELETE SET NULL;


--
-- Name: product_impressions product_impressions_product_id_fkey; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.product_impressions
    ADD CONSTRAINT product_impressions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews_unified reviews_unified_product_uid_fkey; Type: FK CONSTRAINT; Schema: archive; Owner: -
--

ALTER TABLE ONLY archive.reviews_unified
    ADD CONSTRAINT reviews_unified_product_uid_fkey FOREIGN KEY (product_uid) REFERENCES archive.product_catalog(product_uid) ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: product_id_map product_id_map_current_product_id_fkey; Type: FK CONSTRAINT; Schema: cleanup_backup; Owner: -
--

ALTER TABLE ONLY cleanup_backup.product_id_map
    ADD CONSTRAINT product_id_map_current_product_id_fkey FOREIGN KEY (current_product_id) REFERENCES public.ecom_products(id);


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_code_fkey FOREIGN KEY (code) REFERENCES public.coupons(code) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: coupon_redemptions coupon_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ecom_product_image_versions ecom_product_image_versions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_product_image_versions
    ADD CONSTRAINT ecom_product_image_versions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: ecom_products ecom_products_category_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecom_products
    ADD CONSTRAINT ecom_products_category_slug_fkey FOREIGN KEY (category_slug) REFERENCES public.ecom_categories(slug) ON DELETE SET NULL;


--
-- Name: order_items fk_order_items_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments fk_payments_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_clicks product_clicks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_clicks
    ADD CONSTRAINT product_clicks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_impressions product_impressions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_impressions
    ADD CONSTRAINT product_impressions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: product_rating_stats product_rating_stats_product_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rating_stats
    ADD CONSTRAINT product_rating_stats_product_uid_fkey FOREIGN KEY (product_uid) REFERENCES archive.product_catalog(product_uid) ON DELETE CASCADE;


--
-- Name: product_reviews_raw product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: product_reviews_raw product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews_raw
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: reviews__backup_20250909_181553 reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: reviews__backup_20250909_181553 reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews__backup_20250909_181553
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: shop_clicks shop_clicks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_clicks
    ADD CONSTRAINT shop_clicks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: shop_impressions shop_impressions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_impressions
    ADD CONSTRAINT shop_impressions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.ecom_products(id) ON DELETE CASCADE;


--
-- Name: stripe_customers_map stripe_customers_map_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers_map
    ADD CONSTRAINT stripe_customers_map_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: product_impressions Anyone can insert product impressions; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY "Anyone can insert product impressions" ON archive.product_impressions FOR INSERT WITH CHECK (true);


--
-- Name: product_catalog anon_select; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY anon_select ON archive.product_catalog FOR SELECT TO authenticated USING (true);


--
-- Name: events deny_all; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY deny_all ON archive.events USING (false) WITH CHECK (false);


--
-- Name: ecom_wishlist; Type: ROW SECURITY; Schema: archive; Owner: -
--

ALTER TABLE archive.ecom_wishlist ENABLE ROW LEVEL SECURITY;

--
-- Name: ecom_wishlist ecom_wishlist_delete; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_delete ON archive.ecom_wishlist FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ecom_wishlist ecom_wishlist_insert; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_insert ON archive.ecom_wishlist FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ecom_wishlist ecom_wishlist_owner_delete; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_owner_delete ON archive.ecom_wishlist FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ecom_wishlist ecom_wishlist_owner_insert; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_owner_insert ON archive.ecom_wishlist FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ecom_wishlist ecom_wishlist_owner_read; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_owner_read ON archive.ecom_wishlist FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: ecom_wishlist ecom_wishlist_select; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_select ON archive.ecom_wishlist FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ecom_wishlist ecom_wishlist_update; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY ecom_wishlist_update ON archive.ecom_wishlist FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: events; Type: ROW SECURITY; Schema: archive; Owner: -
--

ALTER TABLE archive.events ENABLE ROW LEVEL SECURITY;

--
-- Name: product_catalog; Type: ROW SECURITY; Schema: archive; Owner: -
--

ALTER TABLE archive.product_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: product_impressions; Type: ROW SECURITY; Schema: archive; Owner: -
--

ALTER TABLE archive.product_impressions ENABLE ROW LEVEL SECURITY;

--
-- Name: product_catalog read catalog; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY "read catalog" ON archive.product_catalog FOR SELECT USING (true);


--
-- Name: reviews_unified; Type: ROW SECURITY; Schema: archive; Owner: -
--

ALTER TABLE archive.reviews_unified ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews_unified reviews_unified_delete; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY reviews_unified_delete ON archive.reviews_unified FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews_unified reviews_unified_insert; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY reviews_unified_insert ON archive.reviews_unified FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews_unified reviews_unified_select; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY reviews_unified_select ON archive.reviews_unified FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews_unified reviews_unified_update; Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY reviews_unified_update ON archive.reviews_unified FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews_unified select approved only (public); Type: POLICY; Schema: archive; Owner: -
--

CREATE POLICY "select approved only (public)" ON archive.reviews_unified FOR SELECT USING ((status = 'approved'::text));


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_clicks Anyone can insert offer clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert offer clicks" ON public.offer_clicks FOR INSERT WITH CHECK (true);


--
-- Name: product_impressions Anyone can insert product impressions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert product impressions" ON public.product_impressions FOR INSERT WITH CHECK (true);


--
-- Name: shop_clicks Anyone can insert shop clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert shop clicks" ON public.shop_clicks FOR INSERT WITH CHECK (true);


--
-- Name: shop_impressions Anyone can insert shop impressions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert shop impressions" ON public.shop_impressions FOR INSERT WITH CHECK (true);


--
-- Name: contact_messages Anyone can submit contact message; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact message" ON public.contact_messages FOR INSERT WITH CHECK (true);


--
-- Name: ecom_product_image_versions Public read ecom product image versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read ecom product image versions" ON public.ecom_product_image_versions FOR SELECT USING (true);


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: addresses addresses_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY addresses_owner ON public.addresses TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: admin_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions allow_read_subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_read_subscriptions ON public.subscriptions FOR SELECT TO authenticated USING (true);


--
-- Name: ecom_categories anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select ON public.ecom_categories FOR SELECT TO authenticated USING (true);


--
-- Name: ecom_product_image_versions anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select ON public.ecom_product_image_versions FOR SELECT TO authenticated USING (true);


--
-- Name: product_rating_stats anon_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select ON public.product_rating_stats FOR SELECT TO authenticated USING (true);


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_srv_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_srv_all ON public.audit_log USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: title_blacklist auth can read title_blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth can read title_blacklist" ON public.title_blacklist FOR SELECT TO authenticated USING (true);


--
-- Name: settings auth write settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth write settings" ON public.settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: auth_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_balance_transactions_cache bal_tx_deny_client_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bal_tx_deny_client_write ON public.stripe_balance_transactions_cache TO authenticated USING (false) WITH CHECK (false);


--
-- Name: stripe_balance_transactions_cache bal_tx_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bal_tx_read_auth ON public.stripe_balance_transactions_cache FOR SELECT TO authenticated USING (true);


--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items cart_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_all ON public.cart_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_delete ON public.cart_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_read ON public.cart_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_owner_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_upd ON public.cart_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_update ON public.cart_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_owner_write ON public.cart_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cart_items cart_items_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cart_items_srv_write ON public.cart_items TO service_role USING (true) WITH CHECK (true);


--
-- Name: carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

--
-- Name: carts carts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carts_owner_all ON public.carts TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: carts carts_owner_del; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carts_owner_del ON public.carts FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: carts carts_owner_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carts_owner_ins ON public.carts FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: carts carts_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carts_owner_read ON public.carts FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: carts carts_owner_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carts_owner_upd ON public.carts FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: stripe_charges_cache charges_deny_client_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY charges_deny_client_write ON public.stripe_charges_cache TO authenticated USING (false) WITH CHECK (false);


--
-- Name: stripe_charges_cache charges_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY charges_read_auth ON public.stripe_charges_cache FOR SELECT TO authenticated USING (true);


--
-- Name: shop_clicks clicks_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clicks_insert_any ON public.shop_clicks FOR INSERT WITH CHECK (true);


--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: coupon_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: coupon_redemptions coupon_redemptions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_delete ON public.coupon_redemptions FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: coupon_redemptions coupon_redemptions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_insert ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: coupon_redemptions coupon_redemptions_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_owner_insert ON public.coupon_redemptions FOR INSERT WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) OR (auth.role() = 'service_role'::text)));


--
-- Name: coupon_redemptions coupon_redemptions_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_owner_read ON public.coupon_redemptions FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: coupon_redemptions coupon_redemptions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_select ON public.coupon_redemptions FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: coupon_redemptions coupon_redemptions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_redemptions_update ON public.coupon_redemptions FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons coupons_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupons_public_read ON public.coupons FOR SELECT USING (((active = true) AND ((valid_from IS NULL) OR (now() >= valid_from)) AND ((valid_to IS NULL) OR (now() <= valid_to))));


--
-- Name: coupons coupons_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupons_srv_write ON public.coupons USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: stripe_customers_cache customers_deny_client_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_deny_client_write ON public.stripe_customers_cache TO authenticated USING (false) WITH CHECK (false);


--
-- Name: stripe_customers_cache customers_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_read_auth ON public.stripe_customers_cache FOR SELECT TO authenticated USING (true);


--
-- Name: auth_roles deny all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deny all" ON public.auth_roles USING (false) WITH CHECK (false);


--
-- Name: line_total_is_generated deny all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deny all" ON public.line_total_is_generated USING (false) WITH CHECK (false);


--
-- Name: review_rate_limits deny all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deny all" ON public.review_rate_limits USING (false) WITH CHECK (false);


--
-- Name: total_is_generated deny all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deny all" ON public.total_is_generated USING (false) WITH CHECK (false);


--
-- Name: stripe_webhooks deny_write_webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_write_webhooks ON public.stripe_webhooks TO authenticated USING (false) WITH CHECK (false);


--
-- Name: ecom_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ecom_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: ecom_categories ecom_categories_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_categories_admin_write ON public.ecom_categories TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: ecom_categories ecom_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_categories_public_read ON public.ecom_categories FOR SELECT USING (true);


--
-- Name: ecom_product_image_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ecom_product_image_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: ecom_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ecom_products ENABLE ROW LEVEL SECURITY;

--
-- Name: ecom_products ecom_products_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_products_admin_write ON public.ecom_products TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: ecom_products ecom_products_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_products_public_read ON public.ecom_products FOR SELECT TO authenticated USING ((status = ANY (ARRAY['active'::text, 'published'::text])));


--
-- Name: ecom_products ecom_products_srv_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_products_srv_all ON public.ecom_products TO service_role USING (true) WITH CHECK (true);


--
-- Name: ecom_wishlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ecom_wishlist ENABLE ROW LEVEL SECURITY;

--
-- Name: ecom_wishlist ecom_wishlist_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_wishlist_owner_delete ON public.ecom_wishlist FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ecom_wishlist ecom_wishlist_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_wishlist_owner_insert ON public.ecom_wishlist FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ecom_wishlist ecom_wishlist_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ecom_wishlist_owner_read ON public.ecom_wishlist FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_status_history hist-ins-own-order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hist-ins-own-order" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: order_status_history hist-sel-own-order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hist-sel-own-order" ON public.order_status_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: product_impressions impr-insert-service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "impr-insert-service" ON public.product_impressions FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: product_impressions impr-select-service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "impr-select-service" ON public.product_impressions FOR SELECT TO service_role USING (true);


--
-- Name: shop_impressions impr_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY impr_insert_any ON public.shop_impressions FOR INSERT WITH CHECK (true);


--
-- Name: line_total_is_generated; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.line_total_is_generated ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_customers_map map_self_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY map_self_only ON public.stripe_customers_map FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: offer_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_owner ON public.order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: order_items order_items_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_owner_read ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: order_items order_items_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_owner_update ON public.order_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: order_items order_items_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_owner_write ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: order_items order_items_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_srv_write ON public.order_items TO service_role USING (true) WITH CHECK (true);


--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner ON public.orders TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: orders orders_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner_read ON public.orders FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: orders orders_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner_update ON public.orders FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: orders orders_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner_write ON public.orders FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: orders orders_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_srv_write ON public.orders TO service_role USING (true) WITH CHECK (true);


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_owner_by_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_owner_by_order ON public.payments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: payments payments_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_owner_read ON public.payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: payments payments_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_owner_write ON public.payments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: payments payments_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_srv_write ON public.payments TO service_role USING (true) WITH CHECK (true);


--
-- Name: product_impressions prod_impr_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prod_impr_insert_any ON public.product_impressions FOR INSERT WITH CHECK (true);


--
-- Name: product_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: product_clicks product_clicks_insert_auth_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_clicks_insert_auth_only ON public.product_clicks FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: product_impressions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_impressions ENABLE ROW LEVEL SECURITY;

--
-- Name: product_rating_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_rating_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews_raw product_reviews_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_owner_insert ON public.product_reviews_raw FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_reviews_raw product_reviews_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_owner_update ON public.product_reviews_raw FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_reviews_raw product_reviews_public_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_public_read_approved ON public.product_reviews_raw FOR SELECT USING ((status = 'approved'::text));


--
-- Name: product_reviews_raw; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_reviews_raw ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews_raw product_reviews_raw_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_raw_delete ON public.product_reviews_raw FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_reviews_raw product_reviews_raw_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_raw_insert ON public.product_reviews_raw FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_reviews_raw product_reviews_raw_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_raw_read ON public.product_reviews_raw FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_reviews_raw product_reviews_raw_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_reviews_raw_update ON public.product_reviews_raw FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_products_cache products_auth_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_auth_read ON public.stripe_products_cache FOR SELECT TO authenticated USING (true);


--
-- Name: products products_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_public_read ON public.products FOR SELECT TO authenticated USING ((status = 'active'::text));


--
-- Name: stripe_products_cache products_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_public_read_active ON public.stripe_products_cache FOR SELECT TO authenticated USING (((COALESCE(active, true) = true) AND (COALESCE(is_public, true) = true)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: ecom_categories public_read_ecom_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ecom_categories ON public.ecom_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ecom_product_image_versions public_read_ecom_product_image_versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ecom_product_image_versions ON public.ecom_product_image_versions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ecom_products public_read_ecom_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ecom_products ON public.ecom_products FOR SELECT TO authenticated, anon USING (true);


--
-- Name: product_rating_stats public_read_product_rating_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_product_rating_stats ON public.product_rating_stats FOR SELECT TO authenticated, anon USING (true);


--
-- Name: products public_read_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_products ON public.products FOR SELECT TO authenticated, anon USING (true);


--
-- Name: total_is_generated read auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read auth" ON public.total_is_generated FOR SELECT TO authenticated USING (true);


--
-- Name: review_rate_limits read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own" ON public.review_rate_limits FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: product_rating_stats read stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read stats" ON public.product_rating_stats FOR SELECT USING (true);


--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: review_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews__backup_20250909_181553; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews__backup_20250909_181553 ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews__backup_20250909_181553_delete ON public.reviews__backup_20250909_181553 FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews__backup_20250909_181553_insert ON public.reviews__backup_20250909_181553 FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews__backup_20250909_181553_select ON public.reviews__backup_20250909_181553 FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews__backup_20250909_181553 reviews__backup_20250909_181553_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews__backup_20250909_181553_update ON public.reviews__backup_20250909_181553 FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews reviews_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_delete ON public.reviews FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews reviews_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews reviews_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_owner_insert ON public.reviews FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: reviews__backup_20250909_181553 reviews_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_owner_read ON public.reviews__backup_20250909_181553 FOR SELECT USING (true);


--
-- Name: reviews reviews_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_owner_update ON public.reviews FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: reviews__backup_20250909_181553 reviews_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_owner_write ON public.reviews__backup_20250909_181553 USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: reviews reviews_select_single; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_select_single ON public.reviews FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (status = 'approved'::text)));


--
-- Name: reviews reviews_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_update ON public.reviews FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: product_rating_stats select prs public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "select prs public" ON public.product_rating_stats FOR SELECT USING (true);


--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: shipments shipments_srv_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shipments_srv_write ON public.shipments USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: shop_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_impressions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_impressions ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_balance_transactions_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_balance_transactions_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_charges_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_charges_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_customers_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_customers_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_customers_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_customers_map ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_products_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_products_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_webhooks stripe_webhooks_deny_client_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stripe_webhooks_deny_client_write ON public.stripe_webhooks TO authenticated USING (false) WITH CHECK (false);


--
-- Name: stripe_webhooks_failed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_webhooks_failed ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_webhooks_failed stripe_webhooks_failed_srv_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stripe_webhooks_failed_srv_only ON public.stripe_webhooks_failed TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_webhooks stripe_webhooks_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stripe_webhooks_read_auth ON public.stripe_webhooks FOR SELECT TO authenticated USING (true);


--
-- Name: subscriptions subs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subs_read ON public.subscriptions FOR SELECT TO authenticated USING (true);


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: title_blacklist svc can delete title_blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "svc can delete title_blacklist" ON public.title_blacklist FOR DELETE TO service_role USING (true);


--
-- Name: title_blacklist svc can read title_blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "svc can read title_blacklist" ON public.title_blacklist FOR SELECT TO service_role USING (true);


--
-- Name: title_blacklist svc can update title_blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "svc can update title_blacklist" ON public.title_blacklist FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: title_blacklist svc can write title_blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "svc can write title_blacklist" ON public.title_blacklist FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: title_blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.title_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: total_is_generated; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.total_is_generated ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Anyone can upload an avatar.; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND (owner = ( SELECT auth.uid() AS uid))));


--
-- Name: objects auth upload product-images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "auth upload product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'product-images'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: objects product_images_admin_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY product_images_admin_write ON storage.objects TO authenticated USING (((bucket_id = 'product-images'::text) AND public.is_admin())) WITH CHECK (((bucket_id = 'product-images'::text) AND public.is_admin()));


--
-- Name: objects product_images_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY product_images_public_read ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'product-images'::text));


--
-- Name: objects products_srv_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY products_srv_write ON storage.objects TO service_role USING (true) WITH CHECK (true);


--
-- Name: objects public_read_product_images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY public_read_product_images ON storage.objects FOR SELECT TO authenticated, anon USING ((bucket_id = 'product-images'::text));


--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: objects storage_objects_delete_own; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY storage_objects_delete_own ON storage.objects FOR DELETE TO authenticated USING ((owner = ( SELECT auth.uid() AS uid)));


--
-- Name: objects storage_objects_update_own; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY storage_objects_update_own ON storage.objects FOR UPDATE TO authenticated USING ((owner = ( SELECT auth.uid() AS uid)));


--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: sys; Owner: -
--

ALTER TABLE sys.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs webhook_logs_admin_only; Type: POLICY; Schema: sys; Owner: -
--

CREATE POLICY webhook_logs_admin_only ON sys.webhook_logs FOR SELECT TO authenticated USING ((((COALESCE(NULLIF(current_setting('request.jwt.claims'::text, true), ''::text), '{}'::text))::jsonb ->> 'role'::text) = 'admin'::text));


--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict o0jhiB9xCHhRn4edYG6xOwgeFZ3H33d4iD6yYUelW9w6o6D85hQDK5hLaiDYE8V

