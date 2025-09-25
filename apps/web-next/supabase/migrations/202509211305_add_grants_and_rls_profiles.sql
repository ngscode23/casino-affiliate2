-- Ensure anon/authenticated roles have table privileges (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.profiles to anon, authenticated;

-- Make sure RLS is enabled and policies are present
alter table public.profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone.'
  ) then
    execute 'drop policy "Public profiles are viewable by everyone." on public.profiles';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert their own profile.'
  ) then
    execute 'drop policy "Users can insert their own profile." on public.profiles';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile.'
  ) then
    execute 'drop policy "Users can update own profile." on public.profiles';
  end if;
end $$;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

