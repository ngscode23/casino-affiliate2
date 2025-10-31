"use server";

import { NextResponse } from "next/server";
// ключевая правка: используем revalidatePath вместо revalidateTag
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function parseCompositeId(raw: string | null | undefined): { productId: string; userId: string } | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;
  const separatorIndex = decoded.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= decoded.length - 1) return null;
  const productId = decoded.slice(0, separatorIndex).trim();
  const userId = decoded.slice(separatorIndex + 1).trim();
  if (!productId || !userId) return null;
  return { productId, userId };
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
) {
  const params = await context.params;
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const composite = parseCompositeId(params?.reviewId);
  if (!composite) return json({ ok: false, code: "bad_request", message: "review_id invalid" }, 400);

  if (composite.userId !== auth.user.id) return json({ ok: false, code: "forbidden" }, 403);

  try {
    const supabase = getAdminClient();

    const { data: existingRow, error: fetchError } = await supabase
      .from("product_reviews_raw")
      .select("product_id")
      .eq("product_id", composite.productId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (fetchError) return json({ ok: false, code: "db", message: fetchError.message }, 500);
    if (!existingRow) return json({ ok: false, code: "not_found" }, 404);

    const { error: deleteError } = await supabase
      .from("product_reviews_raw")
      .delete()
      .eq("product_id", composite.productId)
      .eq("user_id", auth.user.id);

    if (deleteError) return json({ ok: false, code: "db", message: deleteError.message }, 500);

    const { error: refreshError } = await supabase.rpc("refresh_product_rating_stats", {
      p_product_id: composite.productId,
    });
    if (refreshError) return json({ ok: false, code: "db", message: refreshError.message }, 500);

    // ключевая инвалидация: пересобираем страницу товара
    revalidatePath(`/products/${composite.productId}`, "page");

    return json({ ok: true });
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
