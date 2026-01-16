import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function parseArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const slug = parseArg("--slug") || process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!slug) {
  console.error("Usage: node scripts/sku-photo-smoke.mjs --slug <product-slug>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and a key.");
  console.error("Set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const result = {
  slug,
  catalogId: null,
  catalogThumbnail: null,
  skuId: null,
  skuImages: [],
  ok: false,
};

const { data: catalogRow, error: catalogError } = await supabase
  .from("catalog_products")
  .select("id, slug, thumbnail_url")
  .eq("slug", slug)
  .maybeSingle();

if (catalogError) {
  console.error("catalog_products lookup failed:", catalogError.message);
  process.exit(2);
}

if (catalogRow?.id) {
  result.catalogId = catalogRow.id;
  result.catalogThumbnail = catalogRow.thumbnail_url || null;
}

if (!result.catalogId) {
  const { data: viewRow, error: viewError } = await supabase
    .from("catalog_products_v")
    .select("id, slug, thumbnail_url")
    .eq("slug", slug)
    .maybeSingle();
  if (viewError) {
    console.error("catalog_products_v lookup failed:", viewError.message);
    process.exit(2);
  }
  if (viewRow?.id) {
    result.catalogId = viewRow.id;
    result.catalogThumbnail = viewRow.thumbnail_url || null;
  }
}

if (result.catalogId) {
  const { data: skuRows, error: skuError } = await supabase
    .from("ecom_products")
    .select("id, images")
    .eq("catalog_product_id", result.catalogId)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (skuError) {
    console.error("ecom_products lookup failed:", skuError.message);
    process.exit(2);
  }
  const skuRow = Array.isArray(skuRows) && skuRows.length ? skuRows[0] : null;
  if (skuRow) {
    result.skuId = skuRow.id ?? null;
    result.skuImages = Array.isArray(skuRow.images) ? skuRow.images : [];
  }
} else {
  const { data: skuRows, error: skuError } = await supabase
    .from("ecom_products")
    .select("id, images, catalog_product_id")
    .eq("slug", slug)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (skuError) {
    console.error("ecom_products lookup by slug failed:", skuError.message);
    process.exit(2);
  }
  const skuRow = Array.isArray(skuRows) && skuRows.length ? skuRows[0] : null;
  if (skuRow) {
    result.skuId = skuRow.id ?? null;
    result.catalogId = skuRow.catalog_product_id ?? null;
    result.skuImages = Array.isArray(skuRow.images) ? skuRow.images : [];
  }
}

const firstSkuImage = result.skuImages.length ? result.skuImages[0] : null;
result.ok = Boolean(result.catalogThumbnail || firstSkuImage);

console.log(JSON.stringify({
  slug: result.slug,
  catalogId: result.catalogId,
  catalogThumbnail: result.catalogThumbnail,
  skuId: result.skuId,
  skuImagesCount: result.skuImages.length,
  firstSkuImage,
  ok: result.ok,
}, null, 2));

if (!result.ok) {
  console.log("\nNext steps:");
  console.log("- Upload an image in /admin/shop/products/[id]");
  console.log("- Click Save to persist ecom_products.images and sync thumbnail_url");
  console.log("- Verify NEXT_PUBLIC_SUPABASE_URL in runtime env");
}
