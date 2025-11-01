-- Pending reviews aggregation RPC to reduce API round-trips.
begin;

create or replace function public.pending_reviews_admin_v1(limit_count int default 5)
returns jsonb
language sql
stable
as $$
with params as (
  select least(200, greatest(1, coalesce(limit_count, 5)))::int as max_rows
),

pending as (
  select
    r.id as review_id,
    r.user_id as reviewer_id,
    r.product_id as product_uid,
    r.rating,
    r.title as review_title,
    r.body as review_body,
    r.status,
    r.created_at,
    r.updated_at,
    coalesce(pc.title, ep.title) as product_title,
    coalesce(pc.slug, ep.slug) as product_slug
  from public.product_reviews_raw r
  left join public.product_catalog pc on pc.product_uid = r.product_id
  left join public.ecom_products ep on ep.id = r.product_id
  where r.status = 'pending'
  order by r.created_at desc nulls last, r.id desc
  limit (select max_rows from params)
),

message_rows as (
  select
    m.review_raw_id,
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'root_review_id', m.root_review_id,
        'parent_id', m.parent_id,
        'author_id', m.author_id,
        'author_role', m.author_role,
        'body', m.body,
        'created_at', m.created_at,
        'updated_at', coalesce(m.updated_at, m.created_at)
      )
      order by m.created_at, m.id
    ) as messages
  from public.product_review_messages m
  where m.review_raw_id in (select review_id from pending where review_id is not null)
  group by m.review_raw_id
),

latest_admin as (
  select distinct on (m.review_raw_id)
    m.review_raw_id,
    m.body,
    m.author_id,
    m.created_at
  from public.product_review_messages m
  where m.review_raw_id in (select review_id from pending where review_id is not null)
    and coalesce(m.author_role, '') = 'admin'
  order by m.review_raw_id, m.created_at desc, m.id desc
),

result as (
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.review_id::text,
        'product_uid', p.product_uid,
        'reviewer_id', p.reviewer_id,
        'review_id', p.review_id,
        'source_schema', 'public',
        'source_table', 'product_reviews_raw',
        'source_pk', p.review_id::text,
        'product_title', p.product_title,
        'product_slug', p.product_slug,
        'rating', p.rating,
        'review_title', p.review_title,
        'review_body', p.review_body,
        'status', p.status,
        'created_at', p.created_at,
        'reply_body', la.body,
        'reply_author_id', la.author_id,
        'reply_created_at', la.created_at,
        'messages', coalesce(
          mr.messages,
          jsonb_build_array(
            jsonb_build_object(
              'id', 'raw:' || p.review_id::text,
              'root_review_id', 'raw:' || p.review_id::text,
              'parent_id', null,
              'author_id', p.reviewer_id,
              'author_role', 'user',
              'body', coalesce(p.review_body, ''),
              'created_at', coalesce(p.created_at, timezone('UTC', now())),
              'updated_at', coalesce(p.created_at, timezone('UTC', now()))
            )
          )
        )
      )
      order by p.created_at desc nulls last, p.review_id desc
    ), '[]'::jsonb),
    'total', (select count(*) from public.product_reviews_raw where status = 'pending')
  ) as payload
  from pending p
  left join message_rows mr on mr.review_raw_id = p.review_id
  left join latest_admin la on la.review_raw_id = p.review_id
)
select coalesce((select payload from result), jsonb_build_object('items', '[]'::jsonb, 'total', 0));
$$;

grant execute on function public.pending_reviews_admin_v1(int) to anon, authenticated;

commit;
