-- Normalize legacy orders.status=paid -> succeeded
begin;
  do $$
  begin
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='status') then
      update public.orders set status='succeeded' where status='paid';
    end if;
  end$$;
commit;
