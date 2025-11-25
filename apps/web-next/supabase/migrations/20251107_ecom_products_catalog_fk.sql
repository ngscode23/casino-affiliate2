BEGIN;
SET search_path = catalog, public, extensions;

-- Ensure legacy slugs are mirrored in the new catalog table so existing products keep working.
INSERT INTO catalog.categories (id, slug, title, description, parent_id, sort_order, is_active)
SELECT
  gen_random_uuid(),
  ec.slug,
  COALESCE(NULLIF(ec.name, ''), ec.slug),
  NULL,
  NULL,
  100,
  TRUE
FROM public.ecom_categories ec
WHERE NOT EXISTS (
  SELECT 1
  FROM catalog.categories c
  WHERE c.slug = ec.slug
);

-- Switch product FK to the catalog schema.
ALTER TABLE public.ecom_products
  DROP CONSTRAINT IF EXISTS ecom_products_category_slug_fkey;

ALTER TABLE public.ecom_products
  ADD CONSTRAINT ecom_products_category_slug_fkey
  FOREIGN KEY (category_slug)
  REFERENCES catalog.categories(slug)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY IMMEDIATE;

COMMIT;

