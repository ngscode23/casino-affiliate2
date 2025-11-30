-- Expose catalog product metadata via a public view so REST clients limited to the public schema can still join catalog tables.

DROP VIEW IF EXISTS public.catalog_product_meta;

CREATE VIEW public.catalog_product_meta AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.brand_id,
  b.slug AS brand_slug,
  b.name AS brand_name
FROM catalog.products p
LEFT JOIN catalog.brands b ON b.id = p.brand_id;

GRANT SELECT ON public.catalog_product_meta TO anon, authenticated, service_role;
