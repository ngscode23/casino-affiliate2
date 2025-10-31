import { adminFetch } from "@shared/lib/api";

type PendingReviewItem = {
  id: string;
  product_uid: string | null;
  reviewer_id?: string | null;
  review_id?: string | null;
  source_schema: string | null;
  source_table: string | null;
  source_pk: string | null;
  product_title: string | null;
  product_slug: string | null;
  rating: number | null;
  review_title: string | null;
  review_body: string | null;
  status: string | null;
  created_at: string;
  reply_body?: string | null;
  reply_created_at?: string | null;
  reply_author_id?: string | null;
  messages?: Array<{
    id: string;
    root_review_id: string;
    parent_id: string | null;
    author_id: string | null;
    author_role: string;
    body: string;
    created_at: string;
    updated_at: string;
  }> | null;
};

type PendingReviewsResponse = {
  ok: boolean;
  items: PendingReviewItem[];
  total?: number;
};

type ActionResponse = {
  ok: boolean;
  changed?: boolean;
  message?: string;
};

type ReplyResponse = {
  ok: boolean;
  reply?: {
    body?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await adminFetch(input, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  const json = (await response.json()) as T & { ok?: boolean; message?: string; error?: string };
  if (json && Object.prototype.hasOwnProperty.call(json, "ok") && (json as any).ok === false) {
    throw new Error(String((json as any).message || (json as any).error || "Failed to load reviews"));
  }
  return json;
}

export async function fetchPendingReviews(limit = 5): Promise<{ items: PendingReviewItem[]; total: number }> {
  const payload = await fetchJson<PendingReviewsResponse>(`/api/reviews-admin/pending?limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });

  return {
    items: payload.items ?? [],
    total: typeof payload.total === "number" ? payload.total : (payload.items ?? []).length,
  };
}

export async function approveReview(payload: Record<string, unknown>): Promise<boolean> {
  const response = await fetchJson<ActionResponse>("/api/reviews-admin/approve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return Boolean(response.changed);
}

export async function rejectReview(payload: Record<string, unknown>): Promise<boolean> {
  const response = await fetchJson<ActionResponse>("/api/reviews-admin/reject", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return Boolean(response.changed);
}

export async function replyToReview(payload: Record<string, unknown>): Promise<ReplyResponse["reply"]> {
  const response = await fetchJson<ReplyResponse>("/api/reviews-admin/reply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.reply ?? null;
}

type ApprovedReviewItem = {
  review_id: string | null;
  reviewer_id: string | null;
  product_uid: string | null;
  product_title: string | null;
  product_slug: string | null;
  rating: number | null;
  review_title: string | null;
  review_body: string | null;
  status: string | null;
  created_at: string | null;
  messages: Array<{
    id: string;
    root_review_id: string;
    parent_id: string | null;
    author_id: string | null;
    author_role: string;
    body: string;
    created_at: string;
    updated_at: string;
  }>;
};

export async function fetchApprovedReviews(limit = 20, params?: { product_uid?: string; reviewer_id?: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  if (params?.product_uid) searchParams.set("product_uid", params.product_uid);
  if (params?.reviewer_id) searchParams.set("reviewer_id", params.reviewer_id);

  const payload = await fetchJson<{ ok: boolean; items: ApprovedReviewItem[]; total?: number }>(
    `/api/reviews-admin/approved?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return {
    items: payload.items ?? [],
    total: typeof payload.total === "number" ? payload.total : (payload.items ?? []).length,
  };
}

export type { PendingReviewItem, ApprovedReviewItem };
