-- pending
begin;

create table if not exists public.product_review_replies (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  reviewer_id uuid not null,
  reply text not null,
  author_id uuid not null,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_review_replies_review_unique unique (product_id, reviewer_id)
);

comment on table public.product_review_replies is 'Admin responses to customer product reviews.';
comment on column public.product_review_replies.product_id is 'Product identifier corresponding to product_reviews_raw.product_id.';
comment on column public.product_review_replies.reviewer_id is 'User identifier of the original reviewer (product_reviews_raw.user_id).';
comment on column public.product_review_replies.reply is 'Formatted reply text authored by an administrator.';

create index if not exists product_review_replies_product_idx
  on public.product_review_replies (product_id, reviewer_id);

drop trigger if exists trg_product_review_replies_updated_at on public.product_review_replies;
create trigger trg_product_review_replies_updated_at
  before update on public.product_review_replies
  for each row
  execute function public.set_updated_at();

alter table public.product_review_replies enable row level security;

create policy product_review_replies_select
  on public.product_review_replies
  for select
  using (true);

grant select on public.product_review_replies to anon, authenticated;
grant insert, update, delete on public.product_review_replies to service_role;

commit;
