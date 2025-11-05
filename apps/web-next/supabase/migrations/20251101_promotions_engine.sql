-- pending
begin;

create type if not exists public.promotion_status as enum ('draft', 'scheduled', 'active', 'expired', 'archived');

create type if not exists public.promotion_action_kind as enum (
  'percentage_discount',
  'fixed_amount_discount',
  'buy_x_get_y',
  'free_shipping',
  'gift_product'
);

create type if not exists public.promotion_condition_kind as enum (
  'product',
  'category',
  'collection',
  'order_total',
  'order_quantity',
  'user_segment',
  'utm',
  'schedule',
  'custom'
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  status public.promotion_status not null default 'draft',
  priority integer not null default 100,
  combinable boolean not null default true,
  stack_group text,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_slug_unique unique (slug),
  constraint promotions_starts_before_ends check (
    starts_at is null
    or ends_at is null
    or starts_at <= ends_at
  )
);

comment on table public.promotions is 'Marketing promotions configured via admin to drive complex discount scenarios.';
comment on column public.promotions.slug is 'Stable identifier used by the admin UI and APIs.';
comment on column public.promotions.priority is 'Lower value = higher priority when promotions compete.';
comment on column public.promotions.combinable is 'If false, promotion blocks other non-stackable discounts.';
comment on column public.promotions.stack_group is 'Optional stack group to control mutual exclusions for similar promos.';
comment on column public.promotions.metadata is 'Arbitrary JSON metadata including default actions/conditions.';

drop trigger if exists trg_promotions_updated_at on public.promotions;
create trigger trg_promotions_updated_at
  before update on public.promotions
  for each row
  execute function public.set_updated_at();

create table if not exists public.promotion_actions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  kind public.promotion_action_kind not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.promotion_actions is 'Discount and reward actions attached to a promotion.';
comment on column public.promotion_actions.config is 'Action specific configuration (percentage, fixed amount, thresholds, etc.).';

create index if not exists promotion_actions_promotion_idx
  on public.promotion_actions (promotion_id, kind);

create table if not exists public.promotion_conditions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  kind public.promotion_condition_kind not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.promotion_conditions is 'Eligibility constraints that must pass before a promotion can apply.';
comment on column public.promotion_conditions.config is 'Condition specific JSON (product ids, category slugs, totals, segments, etc.).';

create index if not exists promotion_conditions_promotion_idx
  on public.promotion_conditions (promotion_id, kind);

create table if not exists public.promotion_coupons (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  code text not null,
  usage_limit_total integer,
  usage_limit_per_user integer,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_coupons_limits_positive check (
    coalesce(usage_limit_total, 0) >= 0
    and coalesce(usage_limit_per_user, 0) >= 0
  )
);

comment on table public.promotion_coupons is 'Coupon codes mapped to promotions with usage limits.';
comment on column public.promotion_coupons.code is 'Human readable coupon code (case insensitive).';

create unique index if not exists promotion_coupons_code_unique
  on public.promotion_coupons (lower(code));

drop trigger if exists trg_promotion_coupons_updated_at on public.promotion_coupons;
create trigger trg_promotion_coupons_updated_at
  before update on public.promotion_coupons
  for each row
  execute function public.set_updated_at();

create table if not exists public.promotion_usages (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  coupon_id uuid references public.promotion_coupons(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid,
  discount_amount numeric(12,2) not null default 0,
  currency char(3) not null default 'USD',
  context jsonb not null default '{}'::jsonb,
  applied_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.promotion_usages is 'Audit log of which promotions fired for which orders/users.';
comment on column public.promotion_usages.context is 'Snapshot of cart context (totals, items) when promotion applied.';
comment on column public.promotion_usages.applied_actions is 'Serialized list of actions executed for this promotion.';

create index if not exists promotion_usages_promotion_idx
  on public.promotion_usages (promotion_id, created_at desc);

create index if not exists promotion_usages_coupon_idx
  on public.promotion_usages (coupon_id, user_id);

alter table public.orders
  add column if not exists applied_promotions jsonb not null default '[]'::jsonb;

comment on column public.orders.applied_promotions is 'Snapshot of promotions/actions applied to the order at checkout time.';

alter table public.orders
  add column if not exists coupon_codes text[] not null default '{}'::text[];

comment on column public.orders.coupon_codes is 'List of coupon codes captured for the order.';

alter table public.promotions enable row level security;
alter table public.promotion_actions enable row level security;
alter table public.promotion_conditions enable row level security;
alter table public.promotion_coupons enable row level security;
alter table public.promotion_usages enable row level security;

create policy promotion_select_public
  on public.promotions
  for select
  using (true);

create policy promotion_actions_select_public
  on public.promotion_actions
  for select
  using (true);

create policy promotion_conditions_select_public
  on public.promotion_conditions
  for select
  using (true);

create policy promotion_coupons_select_public
  on public.promotion_coupons
  for select
  using (true);

create policy promotion_usages_service_read
  on public.promotion_usages
  for select
  using (true);

grant select on public.promotions to anon, authenticated;
grant select on public.promotion_actions to anon, authenticated;
grant select on public.promotion_conditions to anon, authenticated;
grant select on public.promotion_coupons to anon, authenticated;
grant select on public.promotion_usages to authenticated;

grant insert, update, delete on public.promotions to service_role;
grant insert, update, delete on public.promotion_actions to service_role;
grant insert, update, delete on public.promotion_conditions to service_role;
grant insert, update, delete on public.promotion_coupons to service_role;
grant insert, update, delete on public.promotion_usages to service_role;

commit;

