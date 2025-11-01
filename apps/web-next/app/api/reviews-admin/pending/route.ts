import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const MAX_LIMIT = 200;

type PendingReviewMessage = {
  id: string;
  root_review_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type PendingReviewItemPayload = {
  id: string;
  product_uid: string | null;
  reviewer_id: string | null;
  review_id: string | null;
  source_schema: string | null;
  source_table: string | null;
  source_pk: string | null;
  product_title: string | null;
  product_slug: string | null;
  rating: number | null;
  review_title: string | null;
  review_body: string | null;
  status: string | null;
  created_at: string | null;
  reply_body: string | null;
  reply_author_id: string | null;
  reply_created_at: string | null;
  messages?: PendingReviewMessage[] | null;
};

type RpcPayload = {
  items?: PendingReviewItemPayload[];
  total?: number;
};

function clampLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(MAX_LIMIT, Math.round(parsed)));
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("pending_reviews_admin_v1", {
      limit_count: limit,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db", message: error.message },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    const payload = (data ?? {}) as RpcPayload;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const normalized = items.map<PendingReviewItemPayload>((item) => ({
      ...item,
      messages: Array.isArray(item.messages) ? item.messages : [],
    }));

    return NextResponse.json(
      {
        ok: true,
        items: normalized,
        total: typeof payload.total === "number" ? payload.total : normalized.length,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "internal", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
