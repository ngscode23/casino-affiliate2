begin;

-- Remove legacy reviews pipeline
drop function if exists public.add_review(bigint, integer, text, text);
drop table if exists public.reviews cascade;

-- New RPC: add_review_v2
create or replace function public.add_review_v2(
  _product_id uuid,
  _user_id uuid,
  _rating int,
  _title text,
  _body text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  insert into public.product_reviews_raw (product_id, user_id, rating, title, body, status, created_at, updated_at)
  values (_product_id, _user_id, _rating, _title, _body, 'pending', now(), now())
  on conflict (product_id, user_id) do update
    set rating = excluded.rating,
        title = excluded.title,
        body = excluded.body,
        updated_at = now()
  returning to_jsonb(product_reviews_raw.*) into v;
  return v;
end;
$$;

revoke all on function public.add_review_v2(uuid, uuid, int, text, text) from public;
grant execute on function public.add_review_v2(uuid, uuid, int, text, text) to authenticated, service_role;

-- Resilient analytics refresh: refresh all existing MVs, ignore errors
create or replace function public.refresh_analytics_mviews()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r record;
begin
  for r in select schemaname, matviewname from pg_matviews where schemaname = 'public' loop
    begin
      execute format('refresh materialized view %I.%I', r.schemaname, r.matviewname);
    exception when others then
      null;
    end;
  end loop;
end;
$$;

-- TTL for clicks & impressions (90 days default)
create or replace function public.purge_old_events(days int default 90)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz := now() - make_interval(days => days);
  c1 bigint; c2 bigint; c3 bigint;
begin
  execute 'delete from public.shop_clicks where created_at < $1' using cutoff; get diagnostics c1 = row_count;
  execute 'delete from public.shop_impressions where created_at < $1' using cutoff; get diagnostics c2 = row_count;
  execute 'delete from public.product_impressions where created_at < $1' using cutoff; get diagnostics c3 = row_count;
  return jsonb_build_object('cutoff', cutoff, 'deleted', jsonb_build_object('shop_clicks', c1, 'shop_impressions', c2, 'product_impressions', c3));
end;
$$;

-- Schedule daily purge via pg_cron at 03:00 UTC (if extension is available)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'daily_analytics_ttl') then
      perform cron.schedule('daily_analytics_ttl', '0 3 * * *', $$select public.purge_old_events(90);$$);
    end if;
  end if;
exception when others then
  null;
end $$;

commit;

