import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { fetchMessagesForReviews, type ReviewMessageRecord } from "../../reviews/messages";
import { ensureAdminToken, isUuid, json } from "../utils";

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
    const productFilter = url.searchParams.get("product_uid");
    const reviewerFilter = url.searchParams.get("reviewer_id");

    let query = supabase
      .from("reviews_unified")
      .select(
        "review_id, reviewer_id, product_uid, product_title, product_slug, rating, review_title, review_body, status, created_at",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (productFilter && isUuid(productFilter)) {
      query = query.eq("product_uid", productFilter);
    }
    if (reviewerFilter && isUuid(reviewerFilter)) {
      query = query.eq("reviewer_id", reviewerFilter);
    }

    const { data, error } = await query;
    if (error) {
      return json({ ok: false, code: "db", message: error.message }, 500);
    }

    const rows = Array.isArray(data) ? data : [];
    const reviewIds = rows
      .map((row) => {
        const raw = typeof row?.review_id === "string" ? row.review_id : typeof row?.review_id === "number" ? String(row.review_id) : null;
        return raw && isUuid(raw) ? raw : null;
      })
      .filter((id): id is string => Boolean(id));

    const messagesByReview = new Map<string, ReviewMessageRecord[]>();

    if (reviewIds.length > 0) {
      const messageResult = await fetchMessagesForReviews(supabase, reviewIds);
      if (messageResult.ok) {
        messageResult.messagesByReview.forEach((value, key) => {
          messagesByReview.set(key, value);
        });
      }
    }

    const items = rows.map((row) => {
      const reviewIdRaw = typeof row?.review_id === "string" ? row.review_id : typeof row?.review_id === "number" ? String(row.review_id) : null;
      const createdAtRaw = typeof row?.created_at === "string" ? row.created_at : null;
      const messages =
        (reviewIdRaw && messagesByReview.get(reviewIdRaw)) || [];

      const normalizedMessages =
        messages.length > 0
          ? messages
          : reviewIdRaw
            ? [
                {
                  id: reviewIdRaw,
                  root_review_id: reviewIdRaw,
                  parent_id: null,
                  author_id: typeof row?.reviewer_id === "string" ? row.reviewer_id : null,
                  author_role: "user",
                  body: typeof row?.review_body === "string" ? row.review_body : "",
                  created_at: createdAtRaw ?? "",
                  updated_at: createdAtRaw ?? "",
                } satisfies ReviewMessageRecord,
              ]
            : [];

      return {
        review_id: reviewIdRaw,
        reviewer_id: typeof row?.reviewer_id === "string" ? row.reviewer_id : null,
        product_uid: typeof row?.product_uid === "string" ? row.product_uid : null,
        product_title: typeof row?.product_title === "string" ? row.product_title : null,
        product_slug: typeof row?.product_slug === "string" ? row.product_slug : null,
        rating: typeof row?.rating === "number" ? row.rating : null,
        review_title: typeof row?.review_title === "string" ? row.review_title : null,
        review_body: typeof row?.review_body === "string" ? row.review_body : null,
        status: typeof row?.status === "string" ? row.status : null,
        created_at: createdAtRaw,
        messages: normalizedMessages,
      };
    });

    return json({ ok: true, items, total: items.length });
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function POST() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
