// netlify/functions/orders-create.ts
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "../lib/shared/auth/guard";
import { json } from "../lib/shared/auth/http";
import { getServiceClient } from "../lib/shared/auth/supabase";

interface OrderPayload {
  items?: Array<{ id?: string; qty?: number }>;
  currency?: string;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePayload(body: string | null | undefined): OrderPayload {
  if (!body) return {};
  try {
    const parsed = JSON.parse(body) as OrderPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  const authResult = await requireAuth(event);
  if ("response" in authResult) return authResult.response;
  const { user, client } = authResult;
  const supabase: SupabaseClient = client;
  const service = getServiceClient();

  try {
    try {
      const orphanCheck = await service
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("user_id", null);
      if (!orphanCheck.error && (orphanCheck.count ?? 0) > 0) {
        console.warn("orders-create", {
          warning: "orphan_orders_detected",
          count: orphanCheck.count,
        });
      }
    } catch (orphanError) {
      console.warn("orders-create orphan check failed", orphanError);
    }

    const payload = parsePayload(event.body);
    const rawItems = Array.isArray(payload.items) ? payload.items.filter((item) => item && item.id) : [];
    const items = rawItems
      .map((i) => ({ id: String(i.id), qty: Math.max(1, Number(i.qty ?? 1)) }))
      .filter((i) => uuidRe.test(i.id));
    const currency = typeof payload.currency === "string" && payload.currency ? payload.currency : undefined;

    let resp;
    if (items.length) {
      resp = await supabase.rpc("place_order_with_items", {
        p_user_id: user.id,
        p_items: items,
        p_currency: currency,
      });
    } else {
      resp = await supabase.rpc("place_order", { p_user_id: user.id });
    }

    if (resp.error) {
      console.error("orders-create", resp.error);
      if (
        resp.error.code === "23503" &&
        typeof resp.error.message === "string" &&
        resp.error.message.includes("orders_user_id_fkey")
      ) {
        return json({ ok: false, code: "user_not_found", message: "User record missing" }, 409);
      }
      return json({ ok: false, code: "db", message: "Database error" }, 500);
    }

    return json({ ok: true, order_id: resp.data });
  } catch (error: unknown) {
    console.error("orders-create", error);
    return json({ ok: false, code: "internal", message: "Internal error" }, 500);
  }
};

export default handler;
