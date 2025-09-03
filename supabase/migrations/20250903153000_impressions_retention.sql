-- RPC for impressions retention cleanup
create or replace function public.cleanup_impressions_before(cutoff_ts timestamptz)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.impressions where ts < cutoff_ts;
end;
$$;

