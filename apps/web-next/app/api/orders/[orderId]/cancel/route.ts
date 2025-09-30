import { json } from "../../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const params = await context.params;
  const orderId = params.orderId;

  if (!orderId) return json({ ok: false, code: "bad_request", message: "orderId_required" }, 400);

  const supabase = getAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return json({ ok: false, code: "not_found" }, 404);
  }

  if ((order as any).user_id !== user.id) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  if (String((order as any).status) !== "pending") {
    return json({ ok: false, code: "conflict", message: "cannot_cancel_in_this_status" }, 409);
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    return json({ ok: false, code: "db", message: updateError.message }, 500);
  }

  return json({ ok: true });
}