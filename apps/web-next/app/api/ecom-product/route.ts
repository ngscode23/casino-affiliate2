import { NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") ?? "").trim();
    if (!slug) {
      return json({ error: "bad_request" }, 400);
    }

    const { data, error } = await (supabase as any)
      .from("catalog_products_v")
      .select("id, slug, title, description, price, currency, thumbnail_url, category_slug, specs, status")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !data) {
      return json({ error: "not_found" }, 404);
    }

    const row = data as Record<string, unknown>;
    const thumbnail = typeof row.thumbnail_url === "string" ? row.thumbnail_url : null;
    const item = {
      id: row.id ?? null,
      slug: row.slug ?? null,
      title: row.title ?? row.slug ?? "Product",
      price: row.price ?? 0,
      rating: 0,
      images: thumbnail ? [thumbnail] : [],
      short_desc: row.description ?? null,
      category_slug: row.category_slug ?? null,
      tags: [],
      specs: row.specs ?? null,
    };

    return json({ item }, 200);
  } catch (error: any) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
}

export function POST() {
  return json({ error: "method_not_allowed" }, 405);
}
