# SKU Ops Quick Guide

This doc is the safe, repeatable flow for creating SKU items with images and having them show on storefront pages.

## Golden path (new product)
1) Create Brand + Model in `/admin/catalog`.
2) Create SKU in `/admin/shop/products/new`.
3) Upload images (jpg/png/webp/gif only; avoid AVIF).
4) Click **Save** after upload.
5) Verify image on:
   - Product page (PDP)
   - Catalog page
   - Home page

## Where data lives
- Catalog models: `catalog_products` (admin) and `catalog_products_v` (storefront read).
- Storefront SKUs: `ecom_products`.
- Storefront image source: `catalog_products_v.thumbnail_url` (primary).
- SKU images: `ecom_products.images` (sync source; first image should be used to fill thumbnail).

## If image shows only in "Recently viewed"
"Recently viewed" is fetched dynamically and can bypass cached pages. If catalog/home/PDP shows no image:
- Click **Save** again in the SKU editor (forces sync + revalidate).
- Wait 1-2 minutes for cache to expire.
- Confirm `catalog_products.thumbnail_url` is set.

## Common failures
- AVIF upload -> rejected. Use JPG/PNG/WEBP/GIF.
- Uploaded image but did not click Save -> `ecom_products.images` stays empty.
- `catalog_products.thumbnail_url` is empty -> storefront shows placeholder.
- Missing `NEXT_PUBLIC_SUPABASE_URL` in runtime env -> Next/Image blocks Supabase domain.

## DB checks (run via Supabase MCP)
Replace `YOUR-SLUG` with the product slug.

```sql
select
  cp.id, cp.slug, cp.thumbnail_url,
  ep.id as sku_id, ep.images
from catalog_products cp
left join ecom_products ep on ep.catalog_product_id = cp.id
where cp.slug = 'YOUR-SLUG';
```

If `thumbnail_url` is null but `images` has URLs, re-save the SKU in admin.

## Smoke script
Run locally with env vars set (no secrets printed):

```bash
node scripts/sku-photo-smoke.mjs --slug YOUR-SLUG
```

The script reports whether the storefront has a thumbnail and/or SKU images, and prints next steps if missing.

## Do NOT use legacy APIs
- `/api/admin-products`
- `/api/admin-get-upload-url`

Use only:
- `/api/admin/shop/products`
- `/api/admin/shop/products/upload-url`
- `/api/admin/shop/products/images`

---
If something is off, provide the slug and check via MCP Supabase (do not inspect SQL in repo).
