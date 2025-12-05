// apps/web-next/app/sitemap.ts
import type { MetadataRoute } from "next";

import { getAdminClient } from "@/utils/supabase/admin";

const PRODUCT_LIMIT = 5000;
const PUBLIC_DATASET = "shop";
const PUBLIC_STATUSES = new Set(["published", "active"]);
const BLOCKED_SLUG_PATTERN = /^(?:admin|test|draft)/i;

type SupabaseAdminClient = ReturnType<typeof getAdminClient>;
type ProductRow = {
  id: string | null;
  slug: string | null;
  created_at: string | null;
  category_slug: string | null;
  dataset: string | null;
};

type ProductMetaRow = {
  id: string;
  slug: string | null;
  status: string | null;
  catalog_product_id: string | null;
  created_at: string | null;
};

type TimestampMap = Map<string, number>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveOrigin();
  const entries: MetadataRoute.Sitemap = [...buildStaticEntries(origin)];

  let supabase: SupabaseAdminClient;
  try {
    supabase = getAdminClient();
  } catch (error) {
    console.error("[sitemap] failed to create Supabase admin client", error);
    return entries;
  }

  const productEntries = await fetchProductEntries(supabase, origin);
  entries.push(...productEntries);

  // Category landing pages by query (?category=) create duplicate URLs; skip them in sitemap.
  // Google will reach category views via internal links.

  return entries;
}

function resolveOrigin(): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://neon4.vercel.app");
  return origin.replace(/\/$/, "");
}

function buildStaticEntries(origin: string): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${origin}/products`, priority: 0.8, changeFrequency: "daily" },
    { url: `${origin}/contact`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${origin}/affiliate`, priority: 0.5, changeFrequency: "monthly" },
  ];
}

async function fetchProductEntries(supabase: SupabaseAdminClient, origin: string) {
  const productEntries: MetadataRoute.Sitemap = [];

  const { data, error } = await supabase
    .from("product_with_discount_with_dataset")
    .select("id, slug, created_at, category_slug, dataset")
    .eq("dataset", PUBLIC_DATASET)
    .order("created_at", { ascending: false })
    .limit(PRODUCT_LIMIT);

  if (error) {
    console.error("[sitemap] failed to load products", error);
    return productEntries;
  }

  const rows = Array.isArray(data) ? (data as ProductRow[]) : [];
  const idList = rows.map((row) => row?.id).filter((value): value is string => Boolean(value));
  const metaMap = await fetchProductMeta(supabase, idList);
  const catalogUpdateMap = await fetchCatalogUpdates(
    supabase,
    Array.from(
      new Set(
        Array.from(metaMap.values())
          .map((row) => row.catalog_product_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  );
  const stockUpdateMap = await fetchStockUpdates(supabase, idList);

  const seenSlugs = new Set<string>();

  for (const row of rows) {
    if (!row) continue;
    const slug = normalizeSlug(row.slug);
    if (!slug || seenSlugs.has(slug) || BLOCKED_SLUG_PATTERN.test(slug)) continue;
    seenSlugs.add(slug);

    const dataset = (row.dataset ?? "").toLowerCase() === "legacy" ? "legacy" : PUBLIC_DATASET;
    if (dataset !== PUBLIC_DATASET) continue;

    const meta = row.id ? metaMap.get(row.id) : undefined;
    const status = normalizeStatus(meta?.status ?? null);
    if (!isPublishableStatus(status)) continue;

    const lastModified = resolveProductLastModified(row, meta, stockUpdateMap, catalogUpdateMap);
    if (!lastModified) continue;

    productEntries.push({
      url: `${origin}/products/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      lastModified,
    });
  }

  return productEntries;
}

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").toString().toLowerCase();
}

function isPublishableStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return PUBLIC_STATUSES.has(status.toLowerCase());
}

function chunkValues<T>(values: T[], size = 200): T[][] {
  if (!values.length) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchProductMeta(client: SupabaseAdminClient, ids: string[]): Promise<Map<string, ProductMetaRow>> {
  const meta = new Map<string, ProductMetaRow>();
  for (const chunk of chunkValues(ids, 200)) {
    if (!chunk.length) continue;
    const { data, error } = await client
      .from("ecom_products")
      .select("id, slug, status, catalog_product_id, created_at")
      .in("id", chunk);
    if (error) {
      console.error("[sitemap] failed to load product meta", error);
      continue;
    }
    const rows = Array.isArray(data) ? (data as ProductMetaRow[]) : [];
    for (const row of rows) {
      if (!row?.id) continue;
      meta.set(row.id, row);
    }
  }
  return meta;
}

async function fetchCatalogUpdates(client: SupabaseAdminClient, ids: string[]): Promise<TimestampMap> {
  const timestamps: TimestampMap = new Map();
  for (const chunk of chunkValues(ids, 200)) {
    if (!chunk.length) continue;
    const { data, error } = await client.from("catalog_products").select("id, updated_at").in("id", chunk);
    if (error) {
      console.error("[sitemap] failed to load catalog updates", error);
      continue;
    }
    const rows = Array.isArray(data)
      ? (data as { id: string | null; updated_at: string | null }[])
      : [];
    for (const row of rows) {
      if (!row?.id) continue;
      recordTimestamp(timestamps, row.id, row.updated_at);
    }
  }
  return timestamps;
}

async function fetchStockUpdates(client: SupabaseAdminClient, ids: string[]): Promise<TimestampMap> {
  const timestamps: TimestampMap = new Map();
  for (const chunk of chunkValues(ids, 200)) {
    if (!chunk.length) continue;
    const { data, error } = await client.from("stock_items").select("product_id, updated_at").in("product_id", chunk);
    if (error) {
      console.error("[sitemap] failed to load stock updates", error);
      continue;
    }
    const rows = Array.isArray(data)
      ? (data as { product_id: string | null; updated_at: string | null }[])
      : [];
    for (const row of rows) {
      if (!row?.product_id) continue;
      recordTimestamp(timestamps, row.product_id, row.updated_at);
    }
  }
  return timestamps;
}

function recordTimestamp(target: TimestampMap, key: string | null | undefined, raw: string | null | undefined) {
  if (!key) return;
  const parsed = parseTimestamp(raw);
  if (!parsed) return;
  const ms = parsed.getTime();
  const current = target.get(key);
  if (!current || ms > current) {
    target.set(key, ms);
  }
}

function resolveProductLastModified(
  row: ProductRow,
  meta: ProductMetaRow | undefined,
  stockMap: TimestampMap,
  catalogMap: TimestampMap,
): Date | undefined {
  const candidates: number[] = [];
  if (row.id) {
    const stockTimestamp = stockMap.get(row.id);
    if (stockTimestamp) candidates.push(stockTimestamp);
  }
  if (meta?.catalog_product_id) {
    const catalogTimestamp = catalogMap.get(meta.catalog_product_id);
    if (catalogTimestamp) candidates.push(catalogTimestamp);
  }
  if (meta?.created_at) {
    const parsed = parseTimestamp(meta.created_at);
    if (parsed) candidates.push(parsed.getTime());
  }
  if (row.created_at) {
    const parsed = parseTimestamp(row.created_at);
    if (parsed) candidates.push(parsed.getTime());
  }
  if (!candidates.length) return undefined;
  return new Date(Math.max(...candidates));
}

function normalizeSlug(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseTimestamp(value: string | null | undefined): Date | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? undefined : new Date(ms);
}

