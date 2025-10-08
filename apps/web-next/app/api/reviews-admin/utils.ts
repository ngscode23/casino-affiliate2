import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";
const ENFORCE_ADMIN_TOKEN = process.env.ENFORCE_ADMIN_TOKEN === "1" || process.env.NODE_ENV === "production";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function ensureAdminToken(request: Request) {
  if (!ENFORCE_ADMIN_TOKEN) return null;
  const headerToken = (request.headers.get("x-admin-token") ?? request.headers.get("X-Admin-Token"))?.trim() ?? "";
  if (!ADMIN_TOKEN || headerToken !== ADMIN_TOKEN) {
    return json({ ok: false, code: "unauthorized" }, 403);
  }
  return null;
}

type ResolveSource = {
  source_schema?: string | null;
  source_table?: string | null;
  source_pk?: string | null;
  product_id?: string | null;
};

export async function resolveProductUid(
  supabase: SupabaseClient,
  source: ResolveSource,
): Promise<string | null> {
  const sourceSchema = (source.source_schema ?? "").trim();
  const sourceTable = (source.source_table ?? "").trim();
  const sourcePk = (source.source_pk ?? "").trim();

  if (sourceSchema && sourceTable && sourcePk) {
    const { data, error } = await supabase
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", sourceSchema)
      .eq("source_table", sourceTable)
      .eq("source_pk", sourcePk)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.product_uid ?? null;
  }

  const legacyProductId = (source.product_id ?? "").trim();
  if (legacyProductId && isUuid(legacyProductId)) {
    const { data, error } = await supabase
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", "public")
      .eq("source_table", "ecom_products")
      .eq("source_pk", legacyProductId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.product_uid ?? null;
  }

  return null;
}

export async function applyReviewStatus(
  supabase: SupabaseClient,
  productUid: string,
  userId: string,
  newStatus: "approved" | "rejected",
) {
  const { data: review, error: findError } = await supabase
    .from("reviews_unified")
    .select("id, status")
    .eq("product_uid", productUid)
    .eq("user_id", userId)
    .neq("status", newStatus)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    return { error: findError };
  }
  if (!review) {
    return { changed: false };
  }

  const rpcRes = await supabase.rpc("admin_set_review_status", { p_review_id: review.id, p_status: newStatus });
  if (!rpcRes.error) {
    return { changed: true };
  }

  const drop = await supabase
    .from("reviews_unified")
    .update({ status: "rejected" })
    .eq("product_uid", productUid)
    .eq("user_id", userId)
    .in("status", ["pending", "approved"])
    .neq("id", review.id);

  if (drop.error) {
    return { error: drop.error };
  }

  const update = await supabase
    .from("reviews_unified")
    .update({ status: newStatus })
    .eq("id", review.id)
    .select("id")
    .single();

  if (update.error) {
    return { error: update.error };
  }

  try {
    await supabase.rpc("recalc_product_rating", { p_product_uid: productUid });
  } catch {
    // rating recalculation is best-effort
  }

  return { changed: true };
}

