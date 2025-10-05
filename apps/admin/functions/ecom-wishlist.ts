import type { Handler } from "@netlify/functions";
import { requireAuth } from "@shared/netlify/shared/auth/guard";
import { json } from "@shared/netlify/shared/auth/http";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export const handler: Handler = async (event) => {
  try {
    const authResult = await requireAuth(event);
    if ("response" in authResult) return authResult.response;
    const supabase = authResult.client;
    const userId = authResult.user.id;

    const p = event.path || "";
    const isList = /\/ecom-wishlist\/list$/i.test(p);
    const isUpsert = /\/ecom-wishlist\/upsert$/i.test(p);
    const isRemove = /\/ecom-wishlist\/remove$/i.test(p);

    if (isList) {
      if (event.httpMethod !== "GET") return json({ ok: false, code: "method_not_allowed" }, 405);
      const { data, error } = await supabase
        .from("ecom_wishlist")
        .select("product_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    if (isUpsert) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      let payload: any = {};
      try { payload = JSON.parse(event.body || "{}"); } catch {}
      const pid = String(payload?.product_id || "").trim();
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);

      const { error } = await supabase
        .from("ecom_wishlist")
        .upsert([{ user_id: userId, product_id: pid }], { onConflict: "user_id,product_id" });
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true });
    }

    if (isRemove) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      let payload: any = {};
      try { payload = JSON.parse(event.body || "{}"); } catch {}
      const pid = String(payload?.product_id || "").trim();
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);

      const { error } = await supabase
        .from("ecom_wishlist")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", pid);
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, code: "not_found" }, 404);
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;



