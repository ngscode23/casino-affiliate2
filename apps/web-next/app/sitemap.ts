// apps/web-next/app/sitemap.ts
import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/env/siteUrl";
import { getAdminClient } from "@/utils/supabase/admin";

const PRODUCT_LIMIT = 5000;
const PUBLIC_STATUSES = new Set(["published"]);
const BLOCKED_SLUG_PATTERN = /^(?:admin|test|draft)/i;

type SupabaseAdminClient = ReturnType<typeof getAdminClient>;
type ProductRow = {
  id: string | null;
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
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

function buildStaticEntries(origin: string): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${origin}/products`, priority: 0.8, changeFrequency: "daily" },
    { url: `${origin}/contact`, priority: 0.5, changeFrequency: "monthly" },
  ];
}

async function fetchProductEntries(supabase: SupabaseAdminClient, origin: string) {
  const productEntries: MetadataRoute.Sitemap = [];

  const { data, error } = await supabase
    .from("catalog_products_v")
    .select("id, slug, created_at, updated_at, status")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(PRODUCT_LIMIT);

  if (error) {
    console.error("[sitemap] failed to load products", error);
    return productEntries;
  }

  const rows = Array.isArray(data) ? (data as ProductRow[]) : [];
  const seenSlugs = new Set<string>();

  for (const row of rows) {
    if (!row) continue;
    const slug = normalizeSlug(row.slug);
    if (!slug || seenSlugs.has(slug) || BLOCKED_SLUG_PATTERN.test(slug)) continue;
    seenSlugs.add(slug);

    const status = normalizeStatus(row.status ?? null);
    if (!isPublishableStatus(status)) continue;

    const lastModified = parseTimestamp(row.updated_at ?? row.created_at);
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

