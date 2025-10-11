-- Grant access to webhook_logs view for admin APIs

begin;

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.webhook_logs to anon, authenticated, service_role;

create or replace function public.purge_webhook_logs(cutoff_ts timestamptz default now() - interval '30 days')
returns bigint
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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

revoke all on function public.purge_webhook_logs(timestamptz) from public;
grant execute on function public.purge_webhook_logs(timestamptz) to authenticated, service_role;

commit;
