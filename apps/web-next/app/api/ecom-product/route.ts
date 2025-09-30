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
      .from("ecom_products")
      .select("id,slug,title,price,rating,images,short_desc,category_slug,tags,specs,created_at")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return json({ error: "not_found" }, 404);
    }

    return json({ item: data }, 200);
  } catch (error: any) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
}

export function POST() {
  return json({ error: "method_not_allowed" }, 405);
}
