import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

import { getAdminClient } from "@/utils/supabase/admin";

const TABLE = "catalog_products_v";
const MAX_LIMIT = 10;
const DEFAULT_LIMIT = 5;
const CACHE_CONTROL = "s-maxage=120, stale-while-revalidate=300";

const querySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => {
      const sanitized = sanitizeSearchParam(value ?? "");
      return sanitized ? sanitized.trim().slice(0, 80) : "";
    })
    .pipe(z.string().min(1).max(80)),
  limit: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? Number(value) : undefined))
    .pipe(z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)),
});

function escapeForILike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { q, limit } = parsed.data;
  const supabase = getAdminClient();
  const pattern = `%${escapeForILike(q)}%`;

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, slug, category_slug, status")
    .eq("status", "published")
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[api/catalog/search-suggest] failed", {
      message: error.message,
      details: (error as { details?: string | null })?.details,
      code: error.code,
    });
    return NextResponse.json({ items: [] }, { status: 500 });
  }

  const items =
    data?.map((row) => ({
      id: row.id ?? "",
      label: row.title ?? row.slug ?? "Product",
      slug: row.slug ?? null,
      category: row.category_slug ?? null,
      rating: null,
    })) ?? [];

  const response = NextResponse.json({ items });
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}
