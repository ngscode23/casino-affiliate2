import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  applyReviewStatus,
  ensureAdminToken,
  isUuid,
  json,
  resolveProductUid,
} from "../utils";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const tokenError = ensureAdminToken(request);
  if (tokenError) return tokenError;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "bad_json" }, 400);
  }

  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  if (!isUuid(userId)) {
    return json({ ok: false, code: "bad_request", message: "user_id invalid" }, 400);
  }

  try {
    const supabase = getAdminClient();
    const productUid = await resolveProductUid(supabase, payload);
    if (!productUid) {
      return json({ ok: false, code: "bad_request", message: "unknown product" }, 400);
    }

    const result = await applyReviewStatus(supabase, productUid, userId, "rejected");
    if ("error" in result && result.error) {
      return json({ ok: false, code: "db", message: result.error.message }, 500);
    }

    return json({ ok: true, changed: result.changed ?? false });
  } catch (error: any) {
    return json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      500,
    );
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}

