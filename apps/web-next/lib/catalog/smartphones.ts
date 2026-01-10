import "server-only";

import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeBrandSlug } from "@/app/products/taxonomy";
import { normalizeSlug } from "./slug";

export type TopBrand = {
  slug: string;
  name: string;
  modelsCount: number;
  skusCount: number;
};

export type BrandRecord = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  website?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

export type SeriesSummary = {
  slug: string;
  title: string;
  modelsCount: number;
  skusCount: number;
};

export type SeriesRecord = {
  slug: string;
  title: string;
  brandSlug: string;
  brandName: string;
};

export type ModelSummary = {
  id: string;
  slug: string;
  title: string;
  skuCount: number;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  avgRating: number | null;
};

export type ModelRecord = {
  id: string;
  slug: string;
  title: string;
  brandSlug: string;
  brandName: string;
  seriesSlug: string;
  seriesTitle: string;
};

export type SmartphoneSku = {
  id: string;
  slug: string;
  title: string;
  priceCents: number | null;
  price: number | null;
  currency: string | null;
  rating: number | null;
  isAvailable: boolean | null;
  inventoryStatus: string | null;
  imageUrl: string | null;
  modelSlug: string;
  modelTitle: string;
  brandSlug: string;
  brandName: string;
  seriesSlug: string;
  seriesTitle: string;
  totalCount: number | null;
};

export type SmartphoneSkuFilters = {
  priceMinCents?: number | null;
  priceMaxCents?: number | null;
  availability?: string | null;
  ratingMin?: number | null;
  sort?: string | null;
};

export async function fetchTopBrandsSmartphones(limit = 12): Promise<TopBrand[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_top_brands_smartphones", { limit_count: limit });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: any) => ({
      slug: String(row?.brand_slug ?? ""),
      name: String(row?.brand_name ?? row?.brand_slug ?? ""),
      modelsCount: Number(row?.models_count ?? 0),
      skusCount: Number(row?.skus_count ?? 0),
    }))
    .filter((row) => row.slug);
}

export function normalizeBrand(value: string): string | null {
  const normalized = normalizeSlug(value);
  const alias = normalizeBrandSlug(normalized ?? value);
  return alias ?? normalized;
}

export async function fetchBrandBySlug(brandSlug: string): Promise<BrandRecord | null> {
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) return null;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("catalog_brands")
    .select("id, slug, name, description, website, status, is_active")
    .ilike("slug", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String((data as any).id ?? ""),
    slug: String((data as any).slug ?? ""),
    name: String((data as any).name ?? ""),
    description: (data as any).description ?? null,
    website: (data as any).website ?? null,
    status: (data as any).status ?? null,
    is_active: (data as any).is_active ?? null,
  };
}

export async function fetchBrandSeries(brandSlug: string): Promise<SeriesSummary[]> {
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) return [];
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_brand_smartphones", { brand_slug: normalized });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: any) => ({
      slug: String(row?.series_slug ?? ""),
      title: String(row?.series_title ?? row?.series_slug ?? ""),
      modelsCount: Number(row?.models_count ?? 0),
      skusCount: Number(row?.skus_count ?? 0),
    }))
    .filter((row) => row.slug);
}

export async function fetchSeriesBySlug(
  brandSlug: string,
  seriesSlug: string,
): Promise<SeriesRecord | null> {
  const normalizedBrand = normalizeBrand(brandSlug);
  const normalizedSeries = normalizeSlug(seriesSlug);
  if (!normalizedBrand || !normalizedSeries) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("catalog_smartphone_models_v")
    .select("series_slug, series_title, brand_slug, brand_name")
    .eq("brand_slug", normalizedBrand)
    .eq("series_slug", normalizedSeries)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const record = data as any;
  const series = typeof record?.series_slug === "string" ? record.series_slug : "";
  const title = typeof record?.series_title === "string" ? record.series_title : series;
  const brand = typeof record?.brand_slug === "string" ? record.brand_slug : "";
  if (!series || !brand) return null;
  return {
    slug: series,
    title: title || series,
    brandSlug: brand,
    brandName: String(record?.brand_name ?? brand),
  };
}

export async function fetchSeriesModels(brandSlug: string, seriesSlug: string): Promise<ModelSummary[]> {
  const normalizedBrand = normalizeBrand(brandSlug);
  const normalizedSeries = normalizeSlug(seriesSlug);
  if (!normalizedBrand || !normalizedSeries) return [];
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_series_models", {
    brand_slug: normalizedBrand,
    series_slug: normalizedSeries,
  });
  if (error || !Array.isArray(data)) return [];
  return data.map((row: any) => ({
    id: String(row?.model_id ?? ""),
    slug: String(row?.model_slug ?? ""),
    title: String(row?.model_title ?? row?.model_slug ?? ""),
    skuCount: Number(row?.sku_count ?? 0),
    priceMinCents: typeof row?.price_min_cents === "number" ? row.price_min_cents : null,
    priceMaxCents: typeof row?.price_max_cents === "number" ? row.price_max_cents : null,
    avgRating: row?.avg_rating == null ? null : Number(row.avg_rating),
  }));
}

export async function fetchModelBySlug(
  brandSlug: string,
  seriesSlug: string,
  modelSlug: string,
): Promise<ModelRecord | null> {
  const normalizedBrand = normalizeBrand(brandSlug);
  const normalizedSeries = normalizeSlug(seriesSlug);
  const normalizedModel = normalizeSlug(modelSlug);
  if (!normalizedBrand || !normalizedSeries || !normalizedModel) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("catalog_smartphone_models_v")
    .select(
      "model_id, model_slug, model_title, brand_slug, brand_name, series_slug, series_title",
    )
    .eq("brand_slug", normalizedBrand)
    .eq("series_slug", normalizedSeries)
    .ilike("model_slug", normalizedModel)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as any;
  return {
    id: String(row?.model_id ?? ""),
    slug: String(row?.model_slug ?? ""),
    title: String(row?.model_title ?? row?.model_slug ?? ""),
    brandSlug: String(row?.brand_slug ?? ""),
    brandName: String(row?.brand_name ?? row?.brand_slug ?? ""),
    seriesSlug: String(row?.series_slug ?? ""),
    seriesTitle: String(row?.series_title ?? row?.series_slug ?? ""),
  };
}

export async function fetchModelSkus(params: {
  brandSlug: string;
  seriesSlug: string;
  modelSlug: string;
  filters?: SmartphoneSkuFilters;
  limit?: number;
  offset?: number;
}): Promise<{ items: SmartphoneSku[]; total: number }> {
  const normalizedBrand = normalizeBrand(params.brandSlug);
  const normalizedSeries = normalizeSlug(params.seriesSlug);
  const normalizedModel = normalizeSlug(params.modelSlug);
  if (!normalizedBrand || !normalizedSeries || !normalizedModel) return { items: [], total: 0 };

  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("list_smartphone_skus", {
    brand_slug: normalizedBrand,
    series_slug: normalizedSeries,
    model_slug: normalizedModel,
    price_min_cents: params.filters?.priceMinCents ?? null,
    price_max_cents: params.filters?.priceMaxCents ?? null,
    availability: params.filters?.availability ?? null,
    rating_min: params.filters?.ratingMin ?? null,
    sort: params.filters?.sort ?? "recent",
    limit_count: params.limit ?? 24,
    offset_count: params.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return { items: [], total: 0 };

  const items = data.map((row: any) => ({
    id: String(row?.sku_id ?? ""),
    slug: String(row?.sku_slug ?? ""),
    title: String(row?.sku_title ?? row?.sku_slug ?? ""),
    priceCents: typeof row?.price_cents === "number" ? row.price_cents : null,
    price: typeof row?.price === "number" ? row.price : null,
    currency: row?.currency ?? null,
    rating: typeof row?.rating === "number" ? row.rating : null,
    isAvailable: typeof row?.is_available === "boolean" ? row.is_available : null,
    inventoryStatus: row?.inventory_status ?? null,
    imageUrl: row?.main_image_url ?? row?.image_path ?? null,
    modelSlug: String(row?.model_slug ?? ""),
    modelTitle: String(row?.model_title ?? row?.model_slug ?? ""),
    brandSlug: String(row?.brand_slug ?? ""),
    brandName: String(row?.brand_name ?? row?.brand_slug ?? ""),
    seriesSlug: String(row?.series_slug ?? ""),
    seriesTitle: String(row?.series_title ?? row?.series_slug ?? ""),
    totalCount: typeof row?.total_count === "number" ? row.total_count : null,
  }));

  const total = items.length ? Number(items[0]?.totalCount ?? items.length) : 0;
  return { items, total };
}
