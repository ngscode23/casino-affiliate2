import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewMessageRecord = {
  id: string;
  root_review_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CreateReviewMessageParams = {
  supabase: SupabaseClient;
  reviewId: string;
  body: string;
  authorId: string | null;
  authorRole: "user" | "admin";
  parentMessageId?: string | null;
  reviewRawIdOverride?: string | null;
};

export type CreateReviewMessageResult =
  | {
      ok: true;
      message: ReviewMessageRecord;
      productId: string | null;
      reviewOwnerId: string | null;
      reviewStatus: string | null;
      rootMessageId: string;
    }
  | {
      ok: false;
      code:
        | "review_not_found"
        | "root_not_found"
        | "parent_not_found"
        | "parent_mismatch"
        | "db";
      message?: string;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type FetchReviewMessagesSuccess = {
  ok: true;
  rootIdByReview: Map<string, string>;
  messagesByReview: Map<string, ReviewMessageRecord[]>;
};

export type FetchReviewMessagesError = {
  ok: false;
  error: { code?: string; message?: string };
};

export async function fetchMessagesForReviews(
  supabase: SupabaseClient,
  reviewIds: string[],
): Promise<FetchReviewMessagesSuccess | FetchReviewMessagesError> {
  const rootIdByReview = new Map<string, string>();
  const reviewIdByRoot = new Map<string, string>();
  const messagesByReview = new Map<string, ReviewMessageRecord[]>();

  if (reviewIds.length === 0) {
    return { ok: true, rootIdByReview, messagesByReview };
  }

  const { data: rootRows, error: rootError } = await supabase
    .from("product_review_messages")
    .select("id, root_review_id, parent_id, review_raw_id")
    .in("review_raw_id", reviewIds);

  if (rootError) {
    return { ok: false, error: { code: rootError.code, message: rootError.message } };
  }

  const rootIds = new Set<string>();
  if (Array.isArray(rootRows)) {
    for (const row of rootRows as Array<{
      id: string | null;
      root_review_id: string | null;
      parent_id: string | null;
      review_raw_id: string | null;
    }>) {
      const rawId = coerceString(row?.review_raw_id);
      if (!rawId) continue;
      const rootId = coerceString(row?.root_review_id ?? row?.id);
      if (!rootId) continue;
      if (!rootIdByReview.has(rawId) || row?.parent_id === null) {
        rootIdByReview.set(rawId, rootId);
      }
      reviewIdByRoot.set(rootId, rawId);
      rootIds.add(rootId);
    }
  }

  if (rootIds.size === 0) {
    return { ok: true, rootIdByReview, messagesByReview };
  }

  const { data: messageRows, error: messageError } = await supabase
    .from("product_review_messages")
    .select("id, root_review_id, parent_id, author_id, author_role, body, created_at, updated_at")
    .in("root_review_id", Array.from(rootIds))
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (messageError) {
    return { ok: false, error: { code: messageError.code, message: messageError.message } };
  }

  if (Array.isArray(messageRows)) {
    for (const row of messageRows as Array<{
      id: string | null;
      root_review_id: string | null;
      parent_id: string | null;
      author_id: string | null;
      author_role: string | null;
      body: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>) {
      const rootId = coerceString(row?.root_review_id);
      const reviewId = reviewIdByRoot.get(rootId);
      const id = coerceString(row?.id);
      if (!rootId || !reviewId || !id) continue;
      const role = coerceString(row?.author_role) || "user";
      const message: ReviewMessageRecord = {
        id,
        root_review_id: rootId,
        parent_id: row?.parent_id ?? null,
        author_id: row?.author_id ?? null,
        author_role: role,
        body: coerceString(row?.body),
        created_at: coerceString(row?.created_at),
        updated_at: coerceString(row?.updated_at ?? row?.created_at),
      };
      const bucket = messagesByReview.get(reviewId);
      if (bucket) {
        bucket.push(message);
      } else {
        messagesByReview.set(reviewId, [message]);
      }
    }
  }

  return { ok: true, rootIdByReview, messagesByReview };
}

export async function createReviewMessage({
  supabase,
  reviewId,
  body,
  authorId,
  authorRole,
  parentMessageId,
  reviewRawIdOverride,
}: CreateReviewMessageParams): Promise<CreateReviewMessageResult> {
  const { data: reviewRow, error: reviewError } = await supabase
    .from("product_reviews_raw")
    .select("id, product_id, user_id, status")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError) {
    return { ok: false, code: "db", message: reviewError.message };
  }
  if (!reviewRow) {
    return { ok: false, code: "review_not_found" };
  }

  const { data: rootRow, error: rootError } = await supabase
    .from("product_review_messages")
    .select("id, product_id")
    .eq("review_raw_id", reviewRow.id)
    .is("parent_id", null)
    .maybeSingle();
  if (rootError) {
    return { ok: false, code: "db", message: rootError.message };
  }
  if (!rootRow) {
    return { ok: false, code: "root_not_found" };
  }

  let parentId = rootRow.id;
  if (isNonEmptyString(parentMessageId)) {
    const { data: parentRow, error: parentError } = await supabase
      .from("product_review_messages")
      .select("id, root_review_id")
      .eq("id", parentMessageId)
      .maybeSingle();
    if (parentError) {
      return { ok: false, code: "db", message: parentError.message };
    }
    if (!parentRow) {
      return { ok: false, code: "parent_not_found" };
    }
    if (coerceString(parentRow.root_review_id) !== coerceString(rootRow.id)) {
      return { ok: false, code: "parent_mismatch" };
    }
    parentId = parentRow.id;
  }

  const allRows = await supabase
    .from("product_review_messages")
    .insert({
      root_review_id: rootRow.id,
      parent_id: parentId,
      product_id: rootRow.product_id ?? reviewRow.product_id,
      review_raw_id: reviewRawIdOverride ?? reviewRow.id,
      author_id: authorId,
      author_role: authorRole,
      body,
    })
    .select("id, root_review_id, parent_id, author_id, author_role, body, created_at, updated_at");

  if (allRows.error) {
    return { ok: false, code: "db", message: allRows.error.message };
  }

  const inserted = Array.isArray(allRows.data) ? allRows.data[0] : null;
  if (!inserted) {
    return { ok: false, code: "db", message: "message_insert_failed" };
  }

  const normalized: ReviewMessageRecord = {
    id: coerceString(inserted.id),
    root_review_id: coerceString(inserted.root_review_id ?? rootRow.id),
    parent_id: inserted.parent_id ?? null,
    author_id: inserted.author_id ?? null,
    author_role: coerceString(inserted.author_role ?? authorRole),
    body: coerceString(inserted.body ?? body),
    created_at: coerceString(inserted.created_at),
    updated_at: coerceString(inserted.updated_at ?? inserted.created_at),
  };

  return {
    ok: true,
    message: normalized,
    productId: rootRow.product_id ?? reviewRow.product_id ?? null,
    reviewOwnerId: reviewRow.user_id ?? null,
    reviewStatus: reviewRow.status ?? null,
    rootMessageId: rootRow.id,
  };
}
