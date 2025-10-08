import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    // fall through with empty payload
  }

  const productId = clampString(payload.product_id, 36);
  const ratingRaw = payload.rating;
  const title = clampString(payload.title, 120);
  const body = clampString(payload.body ?? payload.text, 2000);

  if (!isUuid(productId)) {
    return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
  }

  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ ok: false, code: "bad_request", message: "rating must be 1..5" }, 400);
  }

  if (!title || !body) {
    return json({ ok: false, code: "bad_request", message: "title/body required" }, 400);
  }

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from("product_reviews")
      .upsert(
        {
          product_id: productId,
          user_id: auth.user.id,
          rating,
          title,
          body,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,user_id" },
      );

    if (error) {
      return json({ ok: false, code: "db", message: error.message }, 500);
    }

    return json({ ok: true });
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

