-- Чтение нужно pinned_* и проверкам, запись не трогаем.

-- partners: публичный SELECT
alter table public.partners enable row level security;

drop policy if exists partners_read_public on public.partners;
create policy partners_read_public
  on public.partners for select
  using (true);

-- partner_offers: публичный SELECT
alter table public.partner_offers enable row level security;

drop policy if exists partner_offers_read_public on public.partner_offers;
create policy partner_offers_read_public
  on public.partner_offers for select
  using (true);

-- На всякий случай ещё раз даём EXECUTE текущему юзеру (без угадывания имен ролей)
do $$
begin
  execute 'grant execute on function public.pinned_offer_slugs() to ' || current_user;
  execute 'grant execute on function public.pinned_offer_meta()  to ' || current_user;
end $$;


-- политики по факту
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname='public'
  and tablename in ('offers','clicks','impressions','partners','partner_offers')
order by tablename, policyname;

-- pinned-функции вызываются и возвращают хотя бы test
select * from public.pinned_offer_slugs();
select * from public.pinned_offer_meta();


