-- Update demo hero content to replace placeholders
update hero_campaigns
set
  title = 'Neon Shop – электроника и аксессуары с доставкой',
  eyebrow = 'Новинки недели',
  body = 'Смартфоны, аудио, умный дом и зарядные устройства. Быстрая доставка и проверенные бренды.',
  primary_cta_label = 'Перейти в каталог',
  primary_cta_href = '/products',
  secondary_cta_label = 'Смотреть акции',
  secondary_cta_href = '/products?view=deals',
  image_alt = coalesce(image_alt, 'Neon Shop hero'),
  published = true,
  priority = coalesce(priority, 10)
where id = 'e1f603d4-e06e-44cc-a421-ff804e31a73c';

-- Fallback: ensure at least one published hero exists
insert into hero_campaigns (
  id, title, eyebrow, body,
  primary_cta_label, primary_cta_href,
  secondary_cta_label, secondary_cta_href,
  image_url, image_alt, theme, published, priority
)
select
  gen_random_uuid(),
  'Neon Shop – электроника и аксессуары с доставкой',
  'Новинки недели',
  'Смартфоны, аудио, умный дом и зарядные устройства. Быстрая доставка и проверенные бренды.',
  'Перейти в каталог',
  '/products',
  'Смотреть акции',
  '/products?view=deals',
  'https://via.placeholder.com/1200x800',
  'Neon Shop hero',
  'dark',
  true,
  9
where not exists (select 1 from hero_campaigns where published = true);
