-- Concurrency-safe claiming of email_outbox rows.
-- Prevents duplicate sends when multiple processors run in parallel.

create or replace function public.email_outbox_claim_batch(
  p_limit integer,
  p_stale_minutes integer default 30
)
returns table (
  id uuid,
  type text,
  to_email text,
  payload jsonb,
  attempts integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
with candidates as (
  select eo.id
  from public.email_outbox eo
  where
    (
      eo.status = 'pending'
      and eo.scheduled_at <= now()
      and eo.attempts < 5
    )
    or (
      eo.status = 'processing'
      and eo.updated_at <= now() - (greatest(0, p_stale_minutes)::text || ' minutes')::interval
      and eo.attempts < 5
    )
  order by eo.scheduled_at asc, eo.created_at asc
  for update skip locked
  limit greatest(0, p_limit)
)
update public.email_outbox eo
set
  status = 'processing',
  attempts = eo.attempts + 1,
  updated_at = now()
from candidates c
where eo.id = c.id
returning eo.id, eo.type, eo.to_email, eo.payload, eo.attempts;
$$;

revoke all on function public.email_outbox_claim_batch(integer, integer) from public;
grant execute on function public.email_outbox_claim_batch(integer, integer) to service_role;

