import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureAdminToken, isUuid, json, parseReviewCompositeId } from "../utils";
import { createReviewMessage } from "../../reviews/messages";

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

  const reviewRef = typeof payload.review_id === "string" ? payload.review_id.trim() : "";
  if (!reviewRef) {
    return json({ ok: false, code: "bad_request", message: "review_id required" }, 400);
  }

  const replyText = typeof payload.reply === "string" ? payload.reply.trim() : "";
  if (!replyText) {
    return json({ ok: false, code: "bad_request", message: "reply required" }, 400);
  }
  if (replyText.length > 4000) {
    return json({ ok: false, code: "bad_request", message: "reply too long" }, 400);
  }

  const parentMessageRef =
    typeof payload.parent_message_id === "string" ? payload.parent_message_id.trim() : "";
  if (parentMessageRef && !isUuid(parentMessageRef)) {
    return json({ ok: false, code: "bad_request", message: "parent_message_id invalid" }, 400);
  }

  const productUidPayload = typeof payload.product_uid === "string" ? payload.product_uid.trim() : "";

  try {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    let reviewRow:
      | { id: string; product_id: string | null; user_id: string | null; status: string | null }
      | null = null;
    let compositeProductId: string | null = null;

    if (isUuid(reviewRef)) {
      const { data, error } = await supabase
        .from("product_reviews_raw")
        .select("id, product_id, user_id, status")
        .eq("id", reviewRef)
        .maybeSingle();
      if (error) {
        return json({ ok: false, code: "db", message: error.message }, 500);
      }
      if (!data) {
        return json({ ok: false, code: "not_found", message: "review not found" }, 404);
      }
      reviewRow = data;
    } else {
      const parsed = parseReviewCompositeId(reviewRef);
      if (!parsed) {
        return json({ ok: false, code: "bad_request", message: "review_id invalid" }, 400);
      }
      compositeProductId = parsed.productId;
      const { data, error } = await supabase
        .from("product_reviews_raw")
        .select("id, product_id, user_id, status")
        .eq("product_id", parsed.productId)
        .eq("user_id", parsed.reviewerId)
        .maybeSingle();
      if (error) {
        return json({ ok: false, code: "db", message: error.message }, 500);
      }
      if (!data) {
        return json({ ok: false, code: "not_found", message: "review not found" }, 404);
      }
      reviewRow = data;
    }

    const createResult = await createReviewMessage({
      supabase,
      reviewId: reviewRow.id,
      body: replyText,
      authorId: auth.user.id,
      authorRole: "admin",
      parentMessageId: parentMessageRef || undefined,
    });

    if (!createResult.ok) {
      switch (createResult.code) {
        case "review_not_found":
          return json({ ok: false, code: "not_found", message: "review not found" }, 404);
        case "root_not_found":
          return json({ ok: false, code: "root_not_found" }, 409);
        case "parent_not_found":
          return json({ ok: false, code: "parent_not_found" }, 400);
        case "parent_mismatch":
          return json({ ok: false, code: "bad_request", message: "parent_mismatch" }, 400);
        default:
          return json({ ok: false, code: "db", message: createResult.message }, 500);
      }
    }

    if (createResult.reviewStatus === "pending") {
      const { error: statusErr } = await supabase
        .from("product_reviews_raw")
        .update({ status: "approved", updated_at: now })
        .eq("id", reviewRow.id)
        .eq("status", "pending");
      if (statusErr) {
        console.warn("[reviews-admin:reply] review_status_update", statusErr.message);
      }
    }

    const productUidForRefresh = (() => {
      if (isUuid(productUidPayload)) return productUidPayload;
      if (isUuid(createResult.productId ?? null)) return createResult.productId!;
      if (isUuid(reviewRow.product_id ?? null)) return reviewRow.product_id!;
      if (isUuid(compositeProductId)) return compositeProductId!;
      return null;
    })();

    if (productUidForRefresh) {
      const { error: refreshError } = await supabase.rpc("refresh_product_rating_stats", {
        p_product_id: productUidForRefresh,
      });
      if (refreshError) {
        console.warn("[reviews-admin:reply] refresh_product_rating_stats", refreshError.message);
      }
      try {
        revalidateTag(`reviews:${productUidForRefresh}`, {});
      } catch {
        /* ignore revalidation failures */
      }
    }

    return json({
      ok: true,
      changed: true,
      reply: {
        body: createResult.message.body,
        created_at: createResult.message.created_at || now,
        updated_at: createResult.message.updated_at || now,
      },
      message: createResult.message,
    });
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
