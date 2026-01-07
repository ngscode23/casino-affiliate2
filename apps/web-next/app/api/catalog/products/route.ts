import { NextResponse } from "next/server";
import { z } from "zod";
import { parseFiltersFromSearchParams } from "@/app/products/filter-schema";
import { logDebug } from "@/utils/debug-logger";

import {
  fetchProductsPage,
  PRODUCT_PAGE_HARD_CAP,
  PRODUCT_PAGE_SIZE_DEFAULT,
} from "@/app/products/data";

// API должен всегда учитывать текущие query-параметры (brand/model/category).
// Статическое кеширование ломало фильтры: Next кешировал первый ответ без brand/model
// и отдавал его для всех последующих запросов. Делаем хэндлер полностью динамическим.
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const paginationSchema = z.object({
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
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const parsed = paginationSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const filters = parseFiltersFromSearchParams(url.searchParams);

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
