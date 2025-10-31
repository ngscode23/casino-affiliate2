-- Banner slider content for storefront hero
begin;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  href text not null,
  priority integer not null default 0,
  active_from timestamptz,
  active_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_active_window_chk check (
    active_from is null
    or active_to is null
    or active_from <= active_to
  )
);

comment on table public.banners is 'CMS-managed hero and promotional banners for the storefront.';
comment on column public.banners.priority is 'Higher values surface the banner earlier in the slider.';
comment on column public.banners.href is 'Destination URL for the banner call-to-action.';

create index if not exists banners_active_window_idx
  on public.banners (is_active, active_from, active_to);

create index if not exists banners_priority_idx
  on public.banners (priority desc, id desc)
  where is_active = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_banners_set_updated_at on public.banners;
create trigger trg_banners_set_updated_at
  before update on public.banners
  for each row
  execute function public.set_updated_at();

alter table public.banners enable row level security;

create policy banners_read_active
  on public.banners
  for select
  using (
    is_active
    and (active_from is null or active_from <= now())
    and (active_to is null or active_to >= now())
  );

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to service_role;

commit;

