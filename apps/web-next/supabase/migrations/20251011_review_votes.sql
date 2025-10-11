-- Collect user sentiment on reviews
create table if not exists public.review_votes (
  product_id uuid not null,
  review_author_id uuid not null,
  voter_id uuid not null,
  value integer not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  constraint review_votes_pk primary key (product_id, review_author_id, voter_id),
  constraint review_votes_no_self check (review_author_id <> voter_id)
);

comment on table public.review_votes is 'Stores useful/not-useful votes for product reviews';

create index if not exists review_votes_product_idx on public.review_votes(product_id, review_author_id);

alter table public.review_votes enable row level security;

create policy review_votes_read_all on public.review_votes
  for select
  using (true);

create policy review_votes_write_self on public.review_votes
  for insert
  with check (auth.uid() = voter_id and review_author_id <> auth.uid());

create policy review_votes_update_self on public.review_votes
  for update
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id and review_author_id <> auth.uid());

create policy review_votes_delete_self on public.review_votes
  for delete
  using (auth.uid() = voter_id);

grant select on public.review_votes to authenticated, anon;
grant insert, update, delete on public.review_votes to authenticated;
