-- Phase 2: return extended stats for supplier feed RPC wrappers
create or replace function public.import_supplier_feed_csv(
  p_supplier_id uuid,
  p_csv text,
  p_has_header boolean default true,
  p_miss_threshold integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_items jsonb;
  v_run_id uuid;
  v_stats jsonb;
  v_err text;
  v_lines text[];
  v_header text[];
  v_rows jsonb := '[]'::jsonb;
  v_line text;
  v_vals text[];
  i integer;
  v_start integer := 1;
begin
  perform public.require_admin();

  if p_supplier_id is null then
    raise exception 'supplier_id_required';
  end if;
  if p_csv is null or btrim(p_csv) = '' then
    raise exception 'csv_required';
  end if;

  v_lines := regexp_split_to_array(replace(p_csv, E'\\r\\n', E'\\n'), E'\\n');
  if array_length(v_lines, 1) is null then
    raise exception 'csv_empty';
  end if;

  if p_has_header then
    v_header := public.csv_parse_line(v_lines[1]);
    v_start := 2;
  else
    v_header := array['sku_id','supplier_sku','price_cents','currency','stock_quantity','is_available','inventory_status','cost_cents','lead_time_days'];
    v_start := 1;
  end if;

  for i in v_start .. array_length(v_lines, 1) loop
    v_line := v_lines[i];
    if v_line is null or btrim(v_line) = '' then
      continue;
    end if;
    v_vals := public.csv_parse_line(v_line);
    v_rows := v_rows || jsonb_build_array(
      (select jsonb_object_agg(v_header[j], nullif(v_vals[j], '') )
       from generate_subscripts(v_header, 1) as j)
    );
  end loop;

  v_items := v_rows;

  insert into public.supplier_feed_runs (supplier_id, status)
  values (p_supplier_id, 'running')
  returning id into v_run_id;

  begin
    v_stats := public.import_supplier_feed_core(p_supplier_id, v_items, p_miss_threshold, v_run_id);
    update public.supplier_feed_runs
      set status = 'success', finished_at = now(), stats = v_stats
      where id = v_run_id;
    return jsonb_build_object(
      'success', true,
      'runId', v_run_id,
      'stats', v_stats,
      'offers_upserted', coalesce((v_stats->>'offers_upserted')::int, 0),
      'inventory_upserted', coalesce((v_stats->>'inventory_upserted')::int, 0),
      'products_updated', coalesce((v_stats->>'products_updated')::int, 0)
    );
  exception when others then
    v_err := sqlerrm;
    update public.supplier_feed_runs
      set status = 'failed', finished_at = now(), error = v_err
      where id = v_run_id;
    return jsonb_build_object('success', false, 'runId', v_run_id, 'error', v_err);
  end;
end;
$function$;

create or replace function public.import_supplier_feed_json(
  p_payload jsonb,
  p_miss_threshold integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_supplier_id uuid;
  v_items jsonb;
  v_run_id uuid;
  v_stats jsonb;
  v_err text;
begin
  perform public.require_admin();

  v_supplier_id := public.try_uuid(p_payload->>'supplierId');
  if v_supplier_id is null then
    raise exception 'supplierId_required';
  end if;
  v_items := p_payload->'items';
  if v_items is null then
    raise exception 'items_required';
  end if;

  insert into public.supplier_feed_runs (supplier_id, status)
  values (v_supplier_id, 'running')
  returning id into v_run_id;

  begin
    v_stats := public.import_supplier_feed_core(v_supplier_id, v_items, p_miss_threshold, v_run_id);
    update public.supplier_feed_runs
      set status = 'success', finished_at = now(), stats = v_stats
      where id = v_run_id;
    return jsonb_build_object(
      'success', true,
      'runId', v_run_id,
      'stats', v_stats,
      'offers_upserted', coalesce((v_stats->>'offers_upserted')::int, 0),
      'inventory_upserted', coalesce((v_stats->>'inventory_upserted')::int, 0),
      'products_updated', coalesce((v_stats->>'products_updated')::int, 0)
    );
  exception when others then
    v_err := sqlerrm;
    update public.supplier_feed_runs
      set status = 'failed', finished_at = now(), error = v_err
      where id = v_run_id;
    return jsonb_build_object('success', false, 'runId', v_run_id, 'error', v_err);
  end;
end;
$function$;
