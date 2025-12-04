import { revalidateTag } from "next/cache";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { createReviewMessage } from "../messages";
import { notifyReviewReplyEmail } from "../../reviews-admin/reply-email";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clampBody(value: unknown, max = 4000): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function parseComposite(value: string | null | undefined):
  | { productId: string; reviewerId: string }
  | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const productId = parts[0]?.trim() ?? "";
  const reviewerId = parts.slice(1).join(":").trim();
  if (!productId || !isUuid(reviewerId)) return null;
  return { productId, reviewerId };
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

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

  const bodyText = clampBody(payload.body ?? payload.message ?? payload.reply);
  if (!bodyText) {
    return json({ ok: false, code: "bad_request", message: "body required" }, 400);
  }

  const parentRef = typeof payload.parent_message_id === "string" ? payload.parent_message_id.trim() : "";
  if (parentRef && !isUuid(parentRef)) {
    return json({ ok: false, code: "bad_request", message: "parent_message_id invalid" }, 400);
  }

  const supabase = getAdminClient();

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
      return json({ ok: false, code: "not_found" }, 404);
    }
    reviewRow = data;
  } else {
    const parsed = parseComposite(reviewRef);
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
      return json({ ok: false, code: "not_found" }, 404);
    }
    reviewRow = data;
  }

  const isOwner = reviewRow.user_id === auth.user.id;
  const status = reviewRow.status ?? "";
  if (!isOwner && status !== "approved") {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const createResult = await createReviewMessage({
    supabase,
    reviewId: reviewRow.id,
    body: bodyText,
    authorId: auth.user.id,
    authorRole: "user",
    parentMessageId: parentRef || undefined,
  });

  if (!createResult.ok) {
    switch (createResult.code) {
      case "review_not_found":
        return json({ ok: false, code: "not_found" }, 404);
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

  const productUid =
    (isUuid(createResult.productId ?? null) && createResult.productId) ||
    (isUuid(reviewRow.product_id ?? null) && reviewRow.product_id) ||
    (isUuid(compositeProductId) && compositeProductId) ||
    null;

  if (productUid) {
    try {
      revalidateTag(`reviews:${productUid}`, {});
    } catch {
      /* ignore revalidation failures */
    }
  }

  // Уведомляем владельца отзыва (если он включил notify_review_replies в профиле).
  void notifyReviewReplyEmail({
    reviewOwnerId: createResult.reviewOwnerId,
    productId: createResult.productId,
    replyBody: createResult.message.body,
  });

  return json({
    ok: true,
    message: createResult.message,
    review_id: reviewRow.id,
    product_id: productUid ?? reviewRow.product_id ?? null,
  });
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
