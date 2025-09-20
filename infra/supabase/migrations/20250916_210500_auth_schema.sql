-- Custom authentication schema: users, roles, refresh tokens
begin;

create extension if not exists citext with schema public;

create table if not exists public.auth_roles (
  role text primary key,
  description text,
  created_at timestamptz not null default now()
);

insert into public.auth_roles(role, description)
  values
    ('admin', 'Full administrative access'),
    ('manager', 'Extended back-office access'),
    ('user', 'Default application user')
  on conflict (role) do update set description = excluded.description;

create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  role text not null default 'user' references public.auth_roles(role) on update cascade,
  is_active boolean not null default true,
  last_login_at timestamptz,
  password_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  token_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now()
);

alter table public.auth_roles enable row level security;
alter table public.auth_users enable row level security;
alter table public.refresh_tokens enable row level security;

create policy auth_roles_service_only on public.auth_roles
  for all using (auth.role() = 'service_role');

create policy auth_users_service_only on public.auth_users
  for all using (auth.role() = 'service_role');

create policy refresh_tokens_service_only on public.refresh_tokens
  for all using (auth.role() = 'service_role');

create index if not exists idx_auth_users_email on public.auth_users (email);
create index if not exists idx_auth_users_role on public.auth_users (role);
create index if not exists idx_refresh_tokens_user on public.refresh_tokens (user_id);
create index if not exists idx_refresh_tokens_active on public.refresh_tokens (user_id, expires_at) where revoked_at is null;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_auth_users_set_updated_at on public.auth_users;
create trigger trg_auth_users_set_updated_at
  before update on public.auth_users
  for each row
  execute function public.set_updated_at();

alter table public.refresh_tokens
  add constraint refresh_tokens_expires_check
  check (expires_at > created_at);

create or replace function public.sql_increment_auth_user_token_version(p_user_id uuid)
returns void
language sql
as $$
  update public.auth_users
  set token_version = token_version + 1, updated_at = now()
  where id = p_user_id;
$$;

commit;
