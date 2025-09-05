-- favorites: per-user with strict RLS
create table if not exists public.favorites (
  user_id  uuid        not null,
  -- ВНИМАНИЕ: у тебя сейчас offer_id TEXT. В v2 offers.id = BIGINT.
  -- Если держишь старый режим — оставь TEXT. Если хочешь по уму — см. блок ниже "MIGRATE TO BIGINT".
  offer_id text        not null,
  created_at timestamptz default now(),
  primary key (user_id, offer_id)
);

-- индекс для выборок по пользователю
create index if not exists idx_favorites_user_created_at
  on public.favorites (user_id, created_at desc);

-- включаем RLS всегда
alter table public.favorites enable row level security;

-- подчистим возможные старые политики (безопасно, если их нет)
drop policy if exists "favorites read own"  on public.favorites;
drop policy if exists "favorites write own" on public.favorites;

-- политики, которые зависят от Supabase Auth, создаём ТОЛЬКО если есть схема auth
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    -- читать можно только свои
    create policy "favorites read own"
      on public.favorites for select
      to authenticated
      using (user_id = auth.uid());

    -- писать/обновлять/удалять только свои
    create policy "favorites write own"
      on public.favorites for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  END IF;
END $$;

-- OPTIONAL: разрешить сервис-ключу любые операции (работает и в Docker, и в Supabase)
drop policy if exists "favorites write service" on public.favorites;
create policy "favorites write service"
  on public.favorites
  to service_role
  using (true)
  with check (true);

-- =========== OPTIONAL: MIGRATE TO BIGINT (если хочешь привести к v2) ===========
-- Если хочешь, чтобы favorites ссылалась на offers(id BIGINT), добавь этот блок в отдельной миграции:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='favorites' AND column_name='offer_id'
               AND data_type='text') THEN
    -- только если у тебя favorites.offer_id хранит slug, а не id:
    -- 1) добавляем временную колонку
    ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS offer_id_new BIGINT;
    -- 2) маппим slug -> id (предполагая, что text в favorites.offer_id = offers.slug)
    UPDATE public.favorites f
    SET offer_id_new = o.id
    FROM public.offers o
    WHERE o.slug = f.offer_id AND f.offer_id_new IS NULL;
    -- 3) проверка, что всё смэпилось: строки с NULL = проблемные
    -- 4) переключаемся
    ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_pkey;
    ALTER TABLE public.favorites DROP COLUMN offer_id;
    ALTER TABLE public.favorites RENAME COLUMN offer_id_new TO offer_id;
    ALTER TABLE public.favorites ADD PRIMARY KEY (user_id, offer_id);
    ALTER TABLE public.favorites
      ADD CONSTRAINT favorites_offer_fk
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;
  END IF;
END $$;