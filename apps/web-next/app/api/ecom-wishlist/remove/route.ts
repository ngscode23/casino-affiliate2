import { json, isUuid } from "../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const productId = typeof body?.product_id === "string" ? body.product_id.trim() : "";
    if (!isUuid(productId)) {
      return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from("ecom_wishlist")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("product_id", productId);

    if (error) {
      return json({ ok: false, code: "db", message: error.message || "db" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
