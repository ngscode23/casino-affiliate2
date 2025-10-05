-- public.settings KV store for site configuration (idempotent)
-- Mirrors supabase/settings.sql to bring Cloud in sync

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_settings_updated_at();

alter table public.settings enable row level security;

-- Public can read non-sensitive settings
drop policy if exists "public read settings" on public.settings;
create policy "public read settings"
on public.settings for select
to anon
using (true);

-- Authenticated can manage settings
drop policy if exists "auth write settings" on public.settings;
create policy "auth write settings"
on public.settings for all
to authenticated
using (true)
with check (true);

