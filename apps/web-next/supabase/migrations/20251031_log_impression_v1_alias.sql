-- Stable RPC alias for tracking impressions from external clients.
create or replace function public.log_impression_v1(
  product_id uuid,
  ip inet,
  referrer text default null,
  user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_params jsonb;
begin
  v_params :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'ip', case when ip is null then null else ip::text end,
        'user_agent', user_agent,
        'referrer', referrer
      )
    );

  perform public.log_impression(
    product_id => product_id,
    params => coalesce(v_params, '{}'::jsonb),
    referrer => referrer
  );
end;
$$;

comment on function public.log_impression_v1(uuid, inet, text, text)
  is 'External-facing impression logging contract (wraps public.log_impression)';

grant execute on function public.log_impression_v1(uuid, inet, text, text) to anon, authenticated;
