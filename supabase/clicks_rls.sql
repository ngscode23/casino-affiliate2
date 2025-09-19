-- Enable RLS on clicks and add read policy for authenticated users
alter table public.clicks enable row level security;

-- Allow authenticated users to read clicks (for admin dashboard)
drop policy if exists "auth can read clicks" on public.clicks;
create policy "auth can read clicks"
on public.clicks for select
to authenticated
using (true);

-- Note: inserts are performed only from server (service role) and bypass RLS

-- Optional: RPC to clean up old rows (used by scheduled function)
create or replace function public.cleanup_clicks_before(cutoff_ts timestamptz)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.clicks where ts < cutoff_ts;
end;
$$;
