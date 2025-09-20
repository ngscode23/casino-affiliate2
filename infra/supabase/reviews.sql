-- public.reviews + RPC add_review
-- Creates table, RLS policies, updated_at trigger and RPC for upsert

-- helper: updated_at trigger function (idempotent)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Use a distinct table name to avoid collision with existing views
create table if not exists public.product_reviews (
  product_id uuid not null references public.ecom_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, user_id)
);

drop trigger if exists trg_product_reviews_updated_at on public.product_reviews;
create trigger trg_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

-- RLS
alter table public.product_reviews enable row level security;

-- public can read only approved reviews
drop policy if exists product_reviews_public_read_approved on public.product_reviews;
create policy product_reviews_public_read_approved on public.product_reviews
  for select using (status = 'approved');

-- only owner can insert or update own review
drop policy if exists product_reviews_owner_insert on public.product_reviews;
create policy product_reviews_owner_insert on public.product_reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists product_reviews_owner_update on public.product_reviews;
create policy product_reviews_owner_update on public.product_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No delete policy (only service role will be able to delete)

-- RPC: add_product_review (upsert current user's review), returns row
create or replace function public.add_product_review(
  p_product_id uuid,
  p_rating int,
  p_title text,
  p_body text
)
returns public.product_reviews
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.product_reviews;
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.product_reviews as r (product_id, user_id, rating, title, body, status)
  values (p_product_id, v_uid, p_rating, coalesce(p_title,''), coalesce(p_body,''), 'pending')
  on conflict (product_id, user_id)
  do update set rating = excluded.rating,
                title = excluded.title,
                body = excluded.body,
                status = 'pending',
                updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.add_product_review(uuid,int,text,text) to authenticated;


