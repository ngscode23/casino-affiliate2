import { adminFetch } from "@shared/lib/api";

type PendingReviewItem = {
  id: string;
  product_uid: string | null;
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

export type { PendingReviewItem };
