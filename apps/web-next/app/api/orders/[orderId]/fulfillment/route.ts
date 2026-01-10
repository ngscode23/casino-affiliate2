import { json } from "../../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getOrdersClient } from "@shared/sdk/ordersClient";

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const params = await context.params;
  const orderId = params.orderId;

  if (!orderId) {
    return json({ ok: false, code: "bad_request", message: "orderId_required" }, 400);
  }

  const supabase = getAdminClient();
  const ordersClient = getOrdersClient({ supabase });

  try {
    const detail = await ordersClient.getOrderDetails(orderId, user.id);
    if (!detail) {
      return json({ ok: false, code: "not_found" }, 404);
    }

    const { data, error } = await supabase
      .from("order_fulfillment_v")
      .select("*")
      .eq("order_id", orderId)
      .order("shipment_created_at", { ascending: false, nullsFirst: false });

    if (error) {
      return json({ ok: false, code: "db_error", message: error.message }, 500);
    }

    return json({ ok: true, items: Array.isArray(data) ? data : [] }, 200);
  } catch (err) {
    return json({ ok: false, code: "internal", message: String((err as Error)?.message ?? err) }, 500);
  }
}
