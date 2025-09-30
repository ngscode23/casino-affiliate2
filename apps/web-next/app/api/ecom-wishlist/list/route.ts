import { json } from "../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("ecom_wishlist")
      .select("product_id, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return json({ ok: false, code: "db", message: error.message || "db" }, 500);
    }

    return json({ ok: true, items: data ?? [] }, 200);
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function POST() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
