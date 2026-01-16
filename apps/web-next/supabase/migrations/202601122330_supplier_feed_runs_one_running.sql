-- Prevent concurrent supplier feed runs per supplier.
-- Without this, two cron invocations can race: both see "no running runs" and insert "running" rows.

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'supplier_feed_runs_one_running_per_supplier'
  ) then
    create unique index supplier_feed_runs_one_running_per_supplier
      on public.supplier_feed_runs (supplier_id)
      where status = 'running';
  end if;
end
$$;

