-- Добавить таблицу, если её ещё нет
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    price numeric not null default 0,
    created_at timestamptz not null default now()
);

-- Добавить индекс, если нет
create index if not exists products_price_idx on public.products(price);

-- Удалить таблицу (на случай отката)
-- drop table if exists public.products;