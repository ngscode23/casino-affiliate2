"use server";

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

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
    // ignore malformed payloads and fall through with empty object
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

    let productUid: string | null = null;
    const { data: catalogRow, error: catalogErr } = await supabase
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", "public")
      .in("source_table", ["products", "ecom_products"])
      .eq("source_pk", productId)
      .maybeSingle();
    if (catalogErr) {
      const missingTable =
        catalogErr.code === "PGRST302" ||
        catalogErr.code === "42P01" ||
        /schema cache/i.test(catalogErr.message ?? "") ||
        /does not exist/i.test(catalogErr.message ?? "");
      if (!missingTable) {
        return json({ ok: false, code: "db", message: catalogErr.message }, 500);
      }
    } else {
      productUid = (catalogRow?.product_uid as string | null) ?? null;
    }

    if (!productUid) {
      productUid = productId;
    }

    const now = new Date().toISOString();

    const { data: existingRow, error: existingErr } = await supabase
      .from("product_reviews_raw")
      .select("status, created_at")
      .eq("product_id", productUid)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (existingErr) {
      return json({ ok: false, code: "db", message: existingErr.message }, 500);
    }

    let reviewRecord: Record<string, unknown> | null = null;

    // Автоматически одобряем новые отзывы, чтобы они сразу появлялись на сайте.
    const targetStatus = "approved" as const;

    if (existingRow) {
      const { data, error } = await supabase
        .from("product_reviews_raw")
        .update({
          rating,
          title,
          body,
          status: targetStatus,
          updated_at: now,
        })
        .eq("product_id", productUid)
        .eq("user_id", auth.user.id)
        .select("rating, title, body, status, created_at, updated_at")
        .maybeSingle();
      if (error) {
        return json({ ok: false, code: "db", message: error.message }, 500);
      }
      reviewRecord = data;
    } else {
      const generatedId = randomUUID();
      const { data, error } = await supabase
        .from("product_reviews_raw")
        .insert({
          id: generatedId,
          product_id: productUid,
          user_id: auth.user.id,
          rating,
          title,
          body,
          status: targetStatus,
          created_at: now,
          updated_at: now,
        })
        .select("rating, title, body, status, created_at, updated_at")
        .maybeSingle();
      if (error) {
        return json({ ok: false, code: "db", message: error.message }, 500);
      }
      reviewRecord = data;
    }

    const { error: refreshErr } = await supabase.rpc("refresh_product_rating_stats", {
      p_product_id: productUid,
    });
    if (refreshErr) {
      return json({ ok: false, code: "db", message: refreshErr.message }, 500);
    }

    const { data: statsRow, error: statsErr } = await supabase
      .from("product_rating_stats")
      .select("avg_rating, ratings_count")
      .eq("product_uid", productUid)
      .maybeSingle();
    if (statsErr) {
      return json({ ok: false, code: "db", message: statsErr.message }, 500);
    }

    // Инвалидация кэша отзывов по тегу продукта
    try {
      if (productUid) revalidateTag(`reviews:${productUid}`, {});
    } catch {
      // revalidateTag недоступен локально/в некоторых средах — игнорируем
    }

    return json({
      ok: true,
      review: reviewRecord,
      stats: statsRow ?? null,
    });
  } catch (error: any) {
    return json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      500,
    );
  }
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
