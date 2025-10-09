-- Track RPCs: log_click / log_impression
-- Aligns with analytics pipeline that reads from public.clicks / public.impressions
-- Provides two overloads for each: by product_id (uuid) and by slug (text)

-- Helper: normalize slug
create or replace function public._norm_slug(_slug text)
returns text language sql immutable as $$
  select case when _slug is null or btrim(_slug) = '' then '-' else btrim(_slug) end;
$$;

-- Clicks ---------------------------------------------------------------

create or replace function public.log_click(
  product_id uuid,
  params jsonb default '{}'::jsonb,
  referrer text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_now  timestamptz := now();
begin
  select _norm_slug(p.slug) into v_slug from public.ecom_products p where p.id = product_id limit 1;
  if v_slug is null then
    v_slug := '-';
  end if;

  -- basic dedupe: skip if a recent identical event exists (10s window)
  if exists (
    select 1 from public.clicks c
    where c.slug = v_slug
      and c.referrer is not distinct from referrer
      and c.ts > v_now - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.clicks(ts, slug, referrer, params)
  values (v_now, v_slug, referrer, coalesce(params, '{}'::jsonb));
end;
$$;

create or replace function public.log_click(
  slug text,
  params jsonb default '{}'::jsonb,
  referrer text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := _norm_slug(slug);
  v_now  timestamptz := now();
begin
  if exists (
    select 1 from public.clicks c
    where c.slug = v_slug
      and c.referrer is not distinct from referrer
      and c.ts > v_now - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.clicks(ts, slug, referrer, params)
  values (v_now, v_slug, referrer, coalesce(params, '{}'::jsonb));
end;
$$;

-- Impressions ----------------------------------------------------------

create or replace function public.log_impression(
  product_id uuid,
  params jsonb default '{}'::jsonb,
  referrer text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_now  timestamptz := now();
begin
  select _norm_slug(p.slug) into v_slug from public.ecom_products p where p.id = product_id limit 1;
  if v_slug is null then
    v_slug := '-';
  end if;

  if exists (
    select 1 from public.impressions c
    where c.slug = v_slug
      and c.referrer is not distinct from referrer
      and c.ts > v_now - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.impressions(ts, slug, referrer, params)
  values (v_now, v_slug, referrer, coalesce(params, '{}'::jsonb));
end;
$$;

create or replace function public.log_impression(
  slug text,
  params jsonb default '{}'::jsonb,
  referrer text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := _norm_slug(slug);
  v_now  timestamptz := now();
begin
  if exists (
    select 1 from public.impressions c
    where c.slug = v_slug
      and c.referrer is not distinct from referrer
      and c.ts > v_now - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.impressions(ts, slug, referrer, params)
  values (v_now, v_slug, referrer, coalesce(params, '{}'::jsonb));
end;
$$;

-- Grants (scope to your security model; anon/auth usually sufficient for front calls)
grant execute on function public.log_click(uuid, jsonb, text)      to anon, authenticated;
grant execute on function public.log_click(text, jsonb, text)      to anon, authenticated;
grant execute on function public.log_impression(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.log_impression(text, jsonb, text) to anon, authenticated;

