import { requireAdmin } from "@/utils/auth/guard";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureAdminToken, isUuid, json } from "../utils";
import { fetchMessagesForReviews, type ReviewMessageRecord } from "../../reviews/messages";

function clampLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.round(parsed)));
}

type PendingReviewItemInternal = {
  review_id?: string | null;
  reviewer_id?: string | null;
  review_body?: string | null;
  created_at?: string | null;
  product_uid?: string | null;
  messages?: ReviewMessageRecord[] | undefined;
  reply_body?: string | null;
  reply_author_id?: string | null;
  reply_created_at?: string | null;
};

async function attachMessages(
  supabase: SupabaseClient,
  items: Array<PendingReviewItemInternal & Record<string, unknown>>,
): Promise<void> {
  if (items.length === 0) return;

  const missingCandidates = items
    .map((item, index) => {
      const hasReviewId = typeof item.review_id === "string" && item.review_id;
      if (hasReviewId) return null;
      const productId =
        typeof item.product_uid === "string" && isUuid(item.product_uid) ? item.product_uid : null;
      const reviewerId =
        typeof item.reviewer_id === "string" && isUuid(item.reviewer_id) ? item.reviewer_id : null;
      if (!productId || !reviewerId) return null;
      return { index, productId, reviewerId };
    })
    .filter(
      (value): value is { index: number; productId: string; reviewerId: string } => value !== null,
    );

  if (missingCandidates.length > 0) {
    const filters = missingCandidates.map(
      ({ productId, reviewerId }) => `and(product_id.eq.${productId},user_id.eq.${reviewerId})`,
    );
    if (filters.length > 0) {
      const { data: reviewRows, error: reviewErr } = await supabase
        .from("product_reviews_raw")
        .select("id, product_id, user_id")
        .or(filters.join(","));
      if (reviewErr) {
        console.error(
          "[reviews-admin:pending] review_lookup",
          reviewErr.code ?? "unknown",
          reviewErr.message ?? "",
        );
      } else if (Array.isArray(reviewRows)) {
        const lookup = new Map<string, string>();
        for (const row of reviewRows as Array<{ id: string | null; product_id: string | null; user_id: string | null }>) {
          if (!row?.id || !row?.product_id || !row?.user_id) continue;
          lookup.set(`${row.product_id}:${row.user_id}`, row.id);
        }
        for (const candidate of missingCandidates) {
          const key = `${candidate.productId}:${candidate.reviewerId}`;
          const resolved = lookup.get(key);
          if (resolved && isUuid(resolved)) {
            (items[candidate.index] as Record<string, unknown>).review_id = resolved;
          }
        }
      }
    }
  }

  const reviewIds = items
    .map((item) => (typeof item.review_id === "string" ? item.review_id : null))
    .filter((value): value is string => Boolean(value));

  if (reviewIds.length === 0) {
    for (const item of items) {
      const reviewId = typeof item.review_id === "string" ? item.review_id : null;
      if (!reviewId) continue;
      const fallbackId = `raw:${reviewId}`;
      const fallback: ReviewMessageRecord = {
        id: fallbackId,
        root_review_id: fallbackId,
        parent_id: null,
        author_id: typeof item.reviewer_id === "string" ? item.reviewer_id : null,
        author_role: "user",
        body: typeof item.review_body === "string" ? item.review_body : "",
        created_at: typeof item.created_at === "string" ? item.created_at : "",
        updated_at: typeof item.created_at === "string" ? item.created_at : "",
      };
      item.messages = [fallback];
      item.reply_body = null;
      item.reply_author_id = null;
      item.reply_created_at = null;
    }
    return;
  }

  const messageResult = await fetchMessagesForReviews(supabase, reviewIds);
  const rootIdByReview = new Map<string, string>();
  const messagesByReview = new Map<string, ReviewMessageRecord[]>();

  if (!messageResult.ok) {
    console.error(
      "[reviews-admin:pending] messages",
      messageResult.error.code ?? "unknown",
      messageResult.error.message ?? "",
    );
  } else {
    messageResult.rootIdByReview.forEach((value, key) => rootIdByReview.set(key, value));
    messageResult.messagesByReview.forEach((value, key) => messagesByReview.set(key, value));
  }

  for (const item of items) {
    const reviewId = typeof item.review_id === "string" ? item.review_id : null;
    const authorId = typeof item.reviewer_id === "string" ? item.reviewer_id : null;
    let messageNodes = reviewId ? messagesByReview.get(reviewId) ?? [] : [];

    if ((!messageNodes || messageNodes.length === 0) && reviewId) {
      const fallbackId = `raw:${reviewId}`;
      messageNodes = [
        {
          id: fallbackId,
          root_review_id: fallbackId,
          parent_id: null,
          author_id: authorId,
          author_role: "user",
          body: typeof item.review_body === "string" ? item.review_body : "",
          created_at: typeof item.created_at === "string" ? item.created_at : "",
          updated_at: typeof item.created_at === "string" ? item.created_at : "",
        },
      ];
    }

    item.messages = messageNodes.map((message) => ({ ...message }));
    const adminMessages = messageNodes.filter((message) => message.author_role === "admin");
    const latestAdmin = adminMessages[adminMessages.length - 1] ?? null;
    item.reply_body = latestAdmin?.body ?? null;
    item.reply_author_id = latestAdmin?.author_id ?? null;
    item.reply_created_at = latestAdmin?.created_at ?? null;
  }
}

async function fetchFromView(request: Request) {
  const supabase = getAdminClient();
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));

  const { data, error, count } = await supabase
    .from("product_reviews_admin_v")
    .select(
      "id, review_id, product_uid, source_schema, source_table, source_pk, product_title, product_slug, rating, review_title, review_body, status, created_at",
      { count: "exact" },
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!error && Array.isArray(data) && data.length > 0) {
    await attachMessages(supabase, data as Array<PendingReviewItemInternal & Record<string, unknown>>);
  }

  return { data: data ?? [], error, count: typeof count === "number" ? count : (data ?? []).length } as const;
}

async function fetchFromRaw(request: Request) {
  const supabase = getAdminClient();
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));

  const { data, error } = await supabase
    .from("product_reviews_raw")
    .select("id, product_id, user_id, rating, title, body, status, created_at, updated_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error } as const;
  }

  const items = (data ?? [])
    .map((row) => {
      const productId = (row as any).product_id as string | null;
      const userId = (row as any).user_id as string | null;
      const reviewId = (row as any).id as string | null;
      const title = (row as any).title as string | null;
      const body = (row as any).body as string | null;
      const rating = (row as any).rating as number | null;
      const status = (row as any).status as string | null;
      const createdAt = (row as any).created_at as string | null;
      const updatedAt = (row as any).updated_at as string | null;
      if (!productId || !userId) return null;

      const compositeId = `${productId}:${userId}`;

      return {
        id: compositeId,
        product_uid: productId,
        reviewer_id: userId,
        review_id: reviewId,
        source_schema: "public",
        source_table: "product_reviews_raw",
        source_pk: compositeId,
        product_title: null as string | null,
        product_slug: null as string | null,
        rating,
        review_title: title,
        review_body: body,
        status,
        created_at: createdAt ?? updatedAt ?? new Date().toISOString(),
        reply_body: null as string | null,
        reply_created_at: null as string | null,
        reply_author_id: null as string | null,
        messages: undefined as ReviewMessageRecord[] | undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (items.length === 0) {
    return { data: items, error: null, count: 0 } as const;
  }

  const productIds = Array.from(new Set(items.map((item) => item.product_uid).filter((id): id is string => !!id)));
  if (productIds.length > 0) {
    const { data: catalogRows } = await supabase
      .from("product_catalog")
      .select("product_uid, title, slug")
      .in("product_uid", productIds);
    const catalogMap = new Map<string, { title: string | null; slug: string | null }>();
    if (Array.isArray(catalogRows)) {
      for (const row of catalogRows as Array<{ product_uid: string | null; title: string | null; slug: string | null }>) {
        if (!row?.product_uid) continue;
        catalogMap.set(row.product_uid, { title: row.title ?? null, slug: row.slug ?? null });
      }
    }

    const missing = productIds.filter((id) => !catalogMap.has(id));
    if (missing.length > 0) {
      const { data: productRows } = await supabase
        .from("ecom_products")
        .select("id, title, slug")
        .in("id", missing);
      if (Array.isArray(productRows)) {
        for (const row of productRows as Array<{ id: string | null; title: string | null; slug: string | null }>) {
          if (!row?.id) continue;
          if (!catalogMap.has(row.id)) {
            catalogMap.set(row.id, { title: row.title ?? null, slug: row.slug ?? null });
          }
        }
      }
    }

    for (const item of items) {
      const meta = item.product_uid ? catalogMap.get(item.product_uid) : null;
      if (meta) {
        item.product_title = meta.title;
        item.product_slug = meta.slug;
      }
    }
  }

  await attachMessages(supabase, items);

  return { data: items, error: null, count: items.length } as const;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const tokenError = ensureAdminToken(request);
  if (tokenError) return tokenError;

  try {
    const primary = await fetchFromView(request);
    const primaryHasRows = !primary.error && primary.data.length > 0;
    const primaryHasInvalidIds =
      primaryHasRows && primary.data.some((item) => !isUuid(typeof item.review_id === "string" ? item.review_id : ""));

    if (primaryHasRows && !primaryHasInvalidIds) {
      return json({ ok: true, items: primary.data, total: primary.count });
    }

    const fallback = await fetchFromRaw(request);

    if (primary.error && (!fallback.data || fallback.data.length === 0)) {
      return json({ ok: false, code: "db", message: primary.error.message }, 500);
    }

    if (fallback.error) {
      return json({ ok: false, code: "db", message: fallback.error.message }, 500);
    }

    if (fallback.data.length > 0) {
      return json({ ok: true, items: fallback.data, total: fallback.count });
    }

    const filteredPrimary = primaryHasRows
      ? primary.data.filter((item) => isUuid(typeof item.review_id === "string" ? item.review_id : ""))
      : [];

    if (filteredPrimary.length > 0) {
      return json({ ok: true, items: filteredPrimary, total: filteredPrimary.length });
    }

    return json({ ok: true, items: [], total: 0 });
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

