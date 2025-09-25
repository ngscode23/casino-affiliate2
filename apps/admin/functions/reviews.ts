import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import { requireAuth } from "@shared/netlify/shared/auth/guard";
import { json } from "@shared/netlify/shared/auth/http";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export const handler: Handler = async (event) => {
  try {
    const path = event.path || "";
    const isAdd = /\/reviews\/add\/?$/i.test(path);
    const isList = /\/reviews\/list\/?$/i.test(path);

    if (isList) {
      if (event.httpMethod !== "GET") return json({ ok: false, code: "method_not_allowed" }, 405);

      const qs = event.queryStringParameters || {};
      const productId = String(qs.product_id || "").trim();
      const sourceSchema = String(qs.source_schema || "").trim();
      const sourceTable = String(qs.source_table || "").trim();
      const sourcePk = String(qs.source_pk || "").trim();

      const supabasePublic = getServiceClient();

      let productUid: string | null = null;

      if (sourceSchema && sourceTable && sourcePk) {
        const { data, error } = await supabasePublic
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
        if (!isUuid(productId)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
        const { data, error } = await supabasePublic
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

      const { data: items, error: itemsErr } = await supabasePublic
        .from("reviews_unified")
        .select("rating, title, body, created_at")
        .eq("product_uid", productUid)
        .eq("status", "approved")
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (itemsErr) return json({ ok: false, code: "db", message: itemsErr.message }, 500);

      const { data: stats, error: statsErr } = await supabasePublic
        .from("product_rating_stats")
        .select("avg_rating, ratings_count")
        .eq("product_uid", productUid)
        .maybeSingle();
      if (statsErr) return json({ ok: false, code: "db", message: statsErr.message }, 500);

      return json({ ok: true, items: items ?? [], stats: stats ?? null });
    }

    if (isAdd) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

      const authResult = await requireAuth(event);
      if ("response" in authResult) return authResult.response;
      const { user, client } = authResult;

      let raw: unknown = {};
      try { raw = JSON.parse(event.body || "{}"); } catch { /* ignore */ }

      const productId = String((raw as any)?.product_id || "").trim();
      const rating = Number((raw as any)?.rating);
      const title = String((raw as any)?.title || "").slice(0, 120);
      const body = String((raw as any)?.body ?? (raw as any)?.text ?? "").slice(0, 2000);

      if (!productId || !isUuid(productId)) {
        return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ ok: false, code: "bad_request", message: "rating must be 1..5" }, 400);
      }
      if (!title || !body) {
        return json({ ok: false, code: "bad_request", message: "title/body required" }, 400);
      }

      const supabase = client;
      const { error: upsertErr } = await supabase
        .from("product_reviews")
        .upsert(
          {
            product_id: productId,
            user_id: user.id,
            rating,
            title,
            body,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,user_id" }
        );
      if (upsertErr) return json({ ok: false, code: "db", message: upsertErr.message }, 500);

      return json({ ok: true });
    }

    return json({ ok: false, code: "not_found" }, 404);
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;



