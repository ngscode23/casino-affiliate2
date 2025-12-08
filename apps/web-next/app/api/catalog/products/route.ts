import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { normalizeBrandSlug } from "@/app/products/taxonomy";
import { logDebug } from "@/utils/debug-logger";

import {
  PRODUCT_COLLECTION_TAG,
  PRODUCT_LIST_REVALIDATE_SECONDS,
  fetchProductsPage,
  PRODUCT_PAGE_HARD_CAP,
  PRODUCT_PAGE_SIZE_DEFAULT,
  type ProductFilters,
} from "@/app/products/data";

// API должен всегда учитывать текущие query-параметры (brand/model/category).
// Статическое кеширование ломало фильтры: Next кешировал первый ответ без brand/model
// и отдавал его для всех последующих запросов. Делаем хэндлер полностью динамическим.
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value != null && value !== "" ? Number(value) : undefined))
    .pipe(z.number().int().min(1).max(PRODUCT_PAGE_HARD_CAP).default(PRODUCT_PAGE_SIZE_DEFAULT)),
  cursor: z
    .string()
    .optional()
    .transform((value) => (value != null && value !== "" ? Number(value) : undefined))
    .pipe(z.number().int().min(0).default(0)),
  q: z
    .string()
    .optional()
    .transform((value) => {
      const sanitized = sanitizeSearchParam(value ?? "");
      const trimmed = sanitized ? sanitized.trim().slice(0, 120) : "";
      return trimmed.length ? trimmed : undefined;
    }),
  category: z
    .string()
    .optional()
    .transform((value) => {
      const sanitized = sanitizeSearchParam(value ?? "");
      const trimmed = sanitized ? sanitized.trim().slice(0, 80) : "";
      return trimmed.length ? trimmed : undefined;
    }),
  brand: z
    .string()
    .optional()
    .transform((value) => {
      const sanitized = sanitizeSearchParam(value ?? "");
      const trimmed = sanitized ? sanitized.trim().slice(0, 80) : "";
      return trimmed.length ? trimmed : undefined;
    }),
  model: z
    .string()
    .optional()
    .transform((value) => {
      const sanitized = sanitizeSearchParam(value ?? "");
      const trimmed = sanitized ? sanitized.trim().slice(0, 80) : "";
      return trimmed.length ? trimmed : undefined;
    }),
  dataset: z.enum(["all", "shop"]).default("all"),
  sort: z.enum(["recent", "popular", "price-asc", "price-desc", "impressions"]).default("recent"),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  rating_min: z.coerce.number().min(0).optional(),
});

function toFilters(input: z.infer<typeof querySchema>): ProductFilters {
  const filters: ProductFilters = {
    sort: input.sort,
    dataset: input.dataset,
  };

  if (input.q) filters.query = input.q;
  if (input.category && input.category !== "all") filters.category = input.category;
  if (input.brand && input.brand !== "all") {
    const normalizedBrand = normalizeBrandSlug(input.brand);
    if (normalizedBrand) filters.brand = normalizedBrand;
  }
  if (input.model && input.model !== "all") filters.model = input.model.toLowerCase();

  if (typeof input.price_min === "number" && Number.isFinite(input.price_min)) {
    filters.priceMin = input.price_min;
  }
  if (typeof input.price_max === "number" && Number.isFinite(input.price_max)) {
    filters.priceMax = input.price_max;
  }
  if (typeof input.rating_min === "number" && Number.isFinite(input.rating_min)) {
    filters.minRating = input.rating_min;
  }

  return filters;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const filters = toFilters(parsed);

    if (process.env.NODE_ENV !== "production") {
      console.log("[catalog-debug] api/catalog/products query", {
        raw: Object.fromEntries(url.searchParams.entries()),
        parsed,
        filters,
      });
      logDebug("api/catalog/products", {
        raw: Object.fromEntries(url.searchParams.entries()),
        parsed,
        filters,
      });
    }

    const page = await fetchProductsPage(filters, {
      limit: parsed.limit,
      cursor: parsed.cursor,
    });

    if (process.env.NODE_ENV !== "production") {
      const sample = Array.isArray(page.items) && page.items.length
        ? page.items.slice(0, 2).map((item) => ({
            id: item.id,
            brandSlug: (item as any)?.brandSlug ?? null,
            brandName: (item as any)?.brandName ?? null,
            catalogProductId: (item as any)?.catalogProductId ?? null,
            category: (item as any)?.categorySlug ?? (item as any)?.category ?? null,
          }))
        : [];
      console.log("[catalog-debug] api response sample", {
        items: page.items.length,
        total: page.total,
        sample,
      });
    }

    return NextResponse.json(
      {
        items: page.items,
        nextCursor: page.nextCursor,
        total: page.total,
        categories: page.categories,
        brandFacets: page.brandFacets,
        modelFacets: page.modelFacets,
        error: page.fetchError ?? null,
      },
      {
        headers: {
          // Не кэшируем на CDN/браузере, т.к. данные зависят от query-параметров.
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid query", details: error.flatten() }, { status: 400 });
    }

    console.error("[api/catalog/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
