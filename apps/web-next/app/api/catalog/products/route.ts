import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

import {
  PRODUCT_COLLECTION_TAG,
  PRODUCT_LIST_REVALIDATE_SECONDS,
  fetchProductsPage,
  PRODUCT_PAGE_HARD_CAP,
  PRODUCT_PAGE_SIZE_DEFAULT,
  type ProductFilters,
} from "@/app/products/data";

export const revalidate = 180;
export const dynamic = "force-static";

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
  if (input.brand && input.brand !== "all") filters.brand = input.brand.toLowerCase();
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

    const page = await fetchProductsPage(filters, {
      limit: parsed.limit,
      cursor: parsed.cursor,
    });

    return NextResponse.json(
      {
        items: page.items,
        nextCursor: page.nextCursor,
        total: page.total,
        categories: page.categories,
        error: page.fetchError ?? null,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${PRODUCT_LIST_REVALIDATE_SECONDS}, stale-while-revalidate=${PRODUCT_LIST_REVALIDATE_SECONDS}`,
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
