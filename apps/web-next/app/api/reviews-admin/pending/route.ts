import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureAdminToken, json } from "../utils";

function clampLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.round(parsed)));
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const tokenError = ensureAdminToken(request);
  if (tokenError) return tokenError;

  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get("limit"));

    const { data, error, count } = await supabase
      .from("product_reviews_admin_v")
      .select(
        "id, product_uid, source_schema, source_table, source_pk, product_title, product_slug, rating, review_title, review_body, status, created_at",
        { count: "exact" },
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return json({ ok: false, code: "db", message: error.message }, 500);
    }

    return json({ ok: true, items: data ?? [], total: typeof count === "number" ? count : (data ?? []).length });
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

