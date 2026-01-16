SKU and Catalog Map

Overview
- Catalog = brands/models used to group products.
- SKU = storefront product card shown on the shop.

Where data lives
- Catalog brands: /admin/catalog/brands -> catalog brands table.
- Catalog models: /admin/catalog/products -> catalog products table.
- Storefront SKUs: /admin/shop/products -> ecom_products.

APIs to use (new)
- /api/admin/shop/products (CRUD for ecom_products)
- /api/admin/shop/products/upload-url (image upload URL)
- /api/admin/shop/products/images (image version history)

Legacy APIs (disabled)
- /api/admin-products
- /api/admin-get-upload-url

Dropship mapping
- Link SKU to supplier in /admin/supplier-skus.
- supplier_skus fields: supplier_id + sku_id (ecom_products.id) + supplier_sku (vendor SKU).
- Offers (price): supplier_offers (usually from supplier feed).
- Inventory (stock): supplier_inventory_levels (usually from supplier feed).
 - Source of truth for offers/inventory joins: supplier_id + sku_id. supplier_sku_id is an optional link to supplier_skus.

Category link (SKU -> Category)
- ecom_products uses category_slug (FK to catalog.categories.slug). There is no category_id on ecom_products.

Flow
1) Create Brand and Model in /admin/catalog.
2) Create SKU in /admin/shop/products and link catalog_product_id.
3) Map SKU to supplier in /admin/supplier-skus.
4) Import supplier feed to populate offers and inventory.

Dropship readiness (SKU card)
- UI: /admin/shop/products/[id] shows sellable status + reason codes.
- API: /api/admin/shop/products/readiness?sku_id=...
- Readiness reasons: no_mapping, inventory_missing, inventory_stale, out_of_stock, offer_unavailable.
- CTA buttons in SKU card:
  - Add mapping -> POST /api/admin/supplier-skus
  - Map unmapped vendor SKUs -> GET/POST /api/admin/supplier-feed/unmapped
  - Run feed now -> POST /api/admin/supplier-feed/run
  - Open offers/inventory -> /admin/supplier-offers and /admin/supplier-inventory (filtered by sku_id)

Vendor SKU notes
- Vendor SKU must match supplier feed data (do not invent for real suppliers).
- If no vendor SKU yet, import feed and map from "unmapped vendor SKUs".

Test feed (quick import via console)
- POST /api/admin/supplier-feed/import with items containing:
  - vendor_sku (or supplier_sku)
  - price_cents or price
  - currency
  - stock_quantity and optionally is_available or inventory_status
Example JSON:
{
  "supplier_id": "<supplier-uuid>",
  "items": [
    { "vendor_sku": "TEST-001", "price_cents": 1200, "currency": "USD", "stock_quantity": 5, "is_available": true }
  ]
}
