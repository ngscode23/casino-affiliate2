import { NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const params = url.searchParams;
    const productId = params.get("product_id")?.trim() ?? "";
    const sourceSchema = params.get("source_schema")?.trim() ?? "";
    const sourceTable = params.get("source_table")?.trim() ?? "";
    const sourcePk = params.get("source_pk")?.trim() ?? "";

    let productUid: string | null = null;

    if (sourceSchema && sourceTable && sourcePk) {
      const { data, error } = await supabase
        .from("product_catalog")
        .select("product_uid")
        .eq("source_schema", sourceSchema)
        .eq("source_table", sourceTable)
        .eq("source_pk", sourcePk)
        .maybeSingle();
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      productUid = data?.product_uid ?? null;
    }

    if (!productUid && productId) {
      if (!isUuid(productId)) {
        return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      }
      const { data, error } = await supabase
        .from("product_catalog")
        .select("product_uid")
        .eq("source_schema", "public")
        .eq("source_table", "ecom_products")
        .eq("source_pk", productId)
        .maybeSingle();
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      productUid = data?.product_uid ?? null;
    }

    if (!productUid) {
      return json({ ok: true, items: [], stats: null });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("reviews_unified")
      .select("rating, title, body, created_at")
      .eq("product_uid", productUid)
      .eq("status", "approved")
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (itemsErr) {
      return json({ ok: false, code: "db", message: itemsErr.message }, 500);
    }

    const { data: stats, error: statsErr } = await supabase
      .from("product_rating_stats")
      .select("avg_rating, ratings_count")
      .eq("product_uid", productUid)
      .maybeSingle();
    if (statsErr) {
      return json({ ok: false, code: "db", message: statsErr.message }, 500);
    }

    return json({ ok: true, items: items ?? [], stats: stats ?? null });
  } catch (error: any) {
    return json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      500,
    );
  }
}

export function POST() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}

