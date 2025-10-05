-- Basic contact message log for web-next contact form
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  message text,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit contact message" on public.contact_messages;
create policy "Anyone can submit contact message" on public.contact_messages
  for insert with check (true);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

grant usage on schema public to anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
