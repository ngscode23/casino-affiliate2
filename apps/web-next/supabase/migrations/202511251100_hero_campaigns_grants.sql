-- Ensure anon and authenticated can select hero_campaigns (RLS policies are already defined)
grant select on public.hero_campaigns to anon;
grant select on public.hero_campaigns to authenticated;
