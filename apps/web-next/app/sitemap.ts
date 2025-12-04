// apps/web-next/app/sitemap.ts
import type { MetadataRoute } from "next";

import { getAdminClient } from "@/utils/supabase/admin";

const PRODUCT_LIMIT = 5000;
const CATEGORY_LIMIT = 2000;

type SupabaseAdminClient = ReturnType<typeof getAdminClient>;
type ProductRow = {
  slug: string | null;
  created_at: string | null;
  category_slug: string | null;
  dataset: string | null;
};

type CategoryRow = {
  slug: string | null;
  is_active: boolean | null;
};

type CategoryTimestampMap = Map<string, number>;

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

  const { productEntries, categoryLastModified } = await fetchProductEntries(supabase, origin);
  entries.push(...productEntries);

  const categoryEntries = await fetchCategoryEntries(supabase, origin, categoryLastModified);
  entries.push(...categoryEntries);

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
    { url: `${origin}/wishlist`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${origin}/contact`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${origin}/affiliate`, priority: 0.5, changeFrequency: "monthly" },
  ];
}

async function fetchProductEntries(supabase: SupabaseAdminClient, origin: string) {
  const productEntries: MetadataRoute.Sitemap = [];
  const categoryLastModified: CategoryTimestampMap = new Map();

  const { data, error } = await supabase
    .from("product_with_discount_with_dataset")
    .select("slug, created_at, category_slug, dataset")
    .eq("dataset", "shop")
    .order("created_at", { ascending: false })
    .limit(PRODUCT_LIMIT);

  if (error) {
    console.error("[sitemap] failed to load products", error);
    return { productEntries, categoryLastModified };
  }

  const seenSlugs = new Set<string>();
  const rows = Array.isArray(data) ? (data as ProductRow[]) : [];

  for (const row of rows) {
    if (!row) continue;
    const slug = normalizeSlug(row.slug);
    if (!slug || seenSlugs.has(slug) || /^admin/i.test(slug)) continue;
    seenSlugs.add(slug);

    const lastModified = parseTimestamp(row.created_at);
    const categorySlug = normalizeSlug(row.category_slug);
    if (categorySlug && lastModified) {
      const timestamp = lastModified.getTime();
      const current = categoryLastModified.get(categorySlug);
      if (!current || timestamp > current) {
        categoryLastModified.set(categorySlug, timestamp);
      }
    }

    productEntries.push({
      url: `${origin}/products/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      lastModified: lastModified ?? undefined,
    });
  }

  return { productEntries, categoryLastModified };
}

async function fetchCategoryEntries(
  supabase: SupabaseAdminClient,
  origin: string,
  categoryLastModified: CategoryTimestampMap,
) {
  const categoryEntries: MetadataRoute.Sitemap = [];
  const { data, error } = await supabase
    .from("categories")
    .select("slug, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(CATEGORY_LIMIT);

  if (error) {
    console.error("[sitemap] failed to load categories", error);
    return categoryEntries;
  }

  const seenSlugs = new Set<string>();
  const rows = Array.isArray(data) ? (data as CategoryRow[]) : [];

  for (const row of rows) {
    if (!row) continue;
    if (!row.is_active) continue;
    const slug = normalizeSlug(row.slug);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const lastModifiedTimestamp = categoryLastModified.get(slug);
    categoryEntries.push({
      url: `${origin}/products?category=${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      lastModified: typeof lastModifiedTimestamp === "number" ? new Date(lastModifiedTimestamp) : undefined,
    });
  }

  return categoryEntries;
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

