-- Migration from supabase/settings.sql
-- public.settings: key-value store for site configuration
-- Ensure `settings` is a TABLE, not a VIEW
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'settings'
  ) THEN
    RAISE NOTICE 'Dropping conflicting VIEW public.settings';
    DROP VIEW public.settings CASCADE;
  END IF;
END$$;

-- таблица (если нужна своя схема — подставь поля)
CREATE TABLE IF NOT EXISTS public.settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- функция обновления updated_at
CREATE OR REPLACE FUNCTION public.set_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$ LANGUAGE plpgsql;

-- триггер на таблицу
DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.set_settings_updated_at();
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


