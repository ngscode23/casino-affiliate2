import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { applyReviewStatus, ensureAdminToken, isUuid, json, resolveProductUid } from "../utils";

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

  const reviewId = typeof payload.review_id === "string" ? payload.review_id.trim() : "";
  if (!isUuid(reviewId)) {
    return json({ ok: false, code: "bad_request", message: "review_id invalid" }, 400);
  }

  try {
    const supabase = getAdminClient();
    let productUid = typeof payload.product_uid === "string" ? payload.product_uid.trim() : "";

    if (!productUid) {
      const resolved = await resolveProductUid(supabase, payload);
      productUid = resolved ?? "";
    }

    const normalizedProductUid = productUid && isUuid(productUid) ? productUid : null;

    const result = await applyReviewStatus(supabase, reviewId, normalizedProductUid, "rejected");
    if ("error" in result && result.error) {
      return json({ ok: false, code: "db", message: result.error.message }, 500);
    }
    const targetProductUid = result.productUid ?? normalizedProductUid;
    if (result.changed && targetProductUid && isUuid(targetProductUid)) {
      const { error: refreshErr } = await supabase.rpc("refresh_product_rating_stats", {
        p_product_id: targetProductUid,
      });
      if (refreshErr) {
        return json({ ok: false, code: "db", message: refreshErr.message }, 500);
      }
      try {
        revalidateTag(`reviews:${targetProductUid}`);
      } catch {
        // ignore revalidation failures
      }
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

