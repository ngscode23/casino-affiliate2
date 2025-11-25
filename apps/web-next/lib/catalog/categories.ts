import { unstable_cache } from "next/cache";

import type { NavItem } from "@/components/site-header/site-header.client";
import { getAdminClient } from "@/utils/supabase/admin";

export type CatalogCategory = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
};

export const HEADER_CATEGORIES_TAG = "catalog:header-categories";

const DEFAULT_LIMIT =
  Number(process.env.NEXT_HEADER_CATEGORY_LIMIT ?? process.env.CATALOG_HEADER_LIMIT ?? 6) || 6;

const fetchTopLevelCategoriesCached = unstable_cache(
  async (limit: number): Promise<CatalogCategory[]> => {
    const supabase = getAdminClient();
    const effectiveLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, title, description, parent_id, sort_order, is_active")
      .is("parent_id", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .limit(effectiveLimit * 2);

    if (error) {
      console.error("[catalog] failed to load header categories", error);
      return [];
    }

    return (data ?? [])
      .map((row) => normalizeCategory(row))
      .filter((category): category is CatalogCategory => Boolean(category))
      .slice(0, effectiveLimit);
  },
  ["catalog:header-categories"],
  {
    revalidate: 300,
    tags: [HEADER_CATEGORIES_TAG],
  },
);

const fetchCategoryBySlugCached = unstable_cache(
  async (slug: string): Promise<CatalogCategory | null> => {
    const supabase = getAdminClient();
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;
    const pattern = normalizedSlug.replace(/[%_]/g, "\\$&");

    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, title, description, parent_id, sort_order, is_active")
      .ilike("slug", pattern)
      .maybeSingle();

    if (error) {
      console.error("[catalog] failed to load category by slug", normalizedSlug, error);
      return null;
    }

    const category = normalizeCategory(data);
    if (!category || category.slug.toLowerCase() !== normalizedSlug) {
      return null;
    }
    return category;
  },
  ["catalog:category-by-slug"],
  {
    revalidate: 300,
    tags: [HEADER_CATEGORIES_TAG],
  },
);

function normalizeCategory(row: Record<string, unknown> | null | undefined): CatalogCategory | null {
  if (!row) return null;
  const slugRaw = typeof row.slug === "string" ? row.slug.trim() : "";
  const titleRaw = typeof row.title === "string" ? row.title.trim() : "";
  if (!slugRaw || !titleRaw) return null;

  return {
    id: typeof row.id === "string" ? row.id : slugRaw,
    slug: slugRaw,
    title: titleRaw,
    description: typeof row.description === "string" ? row.description.trim() || null : null,
    parentId: typeof row.parent_id === "string" ? row.parent_id : null,
    sortOrder:
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order) ? row.sort_order : 100,
  };
}

export async function fetchTopLevelCategories(limit = DEFAULT_LIMIT): Promise<CatalogCategory[]> {
  return fetchTopLevelCategoriesCached(limit);
}

export async function fetchCatalogCategoryBySlug(slug: string): Promise<CatalogCategory | null> {
  return fetchCategoryBySlugCached(slug);
}

export type HeaderNavPayload = {
  navItems: NavItem[];
  categories: CatalogCategory[];
};

export async function buildNavWithCatalogCategories(
  baseNav: NavItem[],
  options?: { limit?: number },
): Promise<HeaderNavPayload> {
  const categories = await fetchTopLevelCategories(options?.limit ?? DEFAULT_LIMIT);
  return {
    navItems: baseNav,
    categories,
  };
}
