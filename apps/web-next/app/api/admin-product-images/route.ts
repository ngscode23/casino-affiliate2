import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = "product-images";

function encodePath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function publicUrl(base: string, bucket: string, path: string): string {
  const root = base.replace(/\/$/, "");
  return `${root}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(path)}`;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim();
  if (!productId) return json({ ok: false, error: "bad_request", message: "productId required" }, 400);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return json({ ok: false, error: "misconfig", message: "SUPABASE_URL missing" }, 500);
  }
  const bucket = process.env.SUPABASE_PRODUCT_BUCKET || DEFAULT_BUCKET;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("ecom_product_image_versions")
    .select("id, path, uploaded_at, uploaded_by, is_current, source_url, metadata")
    .eq("product_id", productId)
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (error) {
    return json({ ok: false, error: error.message || "db" }, 500);
  }

  const versions = (data || []).map((row) => ({
    id: row.id,
    path: row.path,
    publicUrl: publicUrl(supabaseUrl, bucket, row.path),
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    isCurrent: row.is_current,
    sourceUrl: row.source_url,
    metadata: row.metadata ?? null,
  }));

  return json({ ok: true, versions });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return json({ ok: false, error: "misconfig", message: "SUPABASE_URL missing" }, 500);
  }
  const bucket = process.env.SUPABASE_PRODUCT_BUCKET || DEFAULT_BUCKET;
  const supabase = getAdminClient();

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json", message: "Invalid JSON body" }, 400);
  }

  const op = String(payload.op || "record");

  async function ensureProductId(): Promise<{ productId: string; sku: string }> {
    const directId = typeof payload.productId === "string" ? payload.productId.trim() : "";
    const skuRaw = typeof payload.sku === "string" ? payload.sku.trim() : "";
    if (directId) {
      return { productId: directId, sku: skuRaw || directId };
    }
    const matchValue = (typeof payload.slug === "string" ? payload.slug : skuRaw).trim();
    if (!matchValue) {
      throw new Error("productId or sku/slug required");
    }
    const { data, error } = await supabase
      .from("ecom_products")
      .select("id, sku")
      .or(`sku.eq.${matchValue},slug.eq.${matchValue}`)
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      throw new Error("Product not found for provided identifier");
    }
    return { productId: data.id, sku: data.sku || matchValue };
  }

  if (op === "record") {
    try {
      const { productId, sku } = await ensureProductId();
      const path = typeof payload.path === "string" ? payload.path.trim() : "";
      if (!path) return json({ ok: false, error: "bad_request", message: "path required" }, 400);
      const sourceUrl = typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() || null : null;
      const metadata = typeof payload.metadata === "object" && payload.metadata ? payload.metadata : null;

      const { data, error } = await supabase
        .from("ecom_product_image_versions")
        .insert({
          product_id: productId,
          sku,
          path,
          source_url: sourceUrl,
          uploaded_by: auth.user.id,
          is_current: true,
          metadata,
        })
        .select("id, path, uploaded_at, is_current")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to record image version");
      }

      await syncPrimaryImage(supabase, productId, path, supabaseUrl, bucket);

      return json({
        ok: true,
        version: {
          id: data.id,
          path: data.path,
          uploadedAt: data.uploaded_at,
          isCurrent: data.is_current,
          publicUrl: publicUrl(supabaseUrl, bucket, data.path),
        },
      });
    } catch (error: unknown) {
      return json({ ok: false, error: "record_failed", message: String((error as Error)?.message ?? error) }, 400);
    }
  }

  if (op === "revert") {
    try {
      const { productId } = await ensureProductId();
      const versionId = typeof payload.versionId === "string" ? payload.versionId.trim() : "";
      if (!versionId) return json({ ok: false, error: "bad_request", message: "versionId required" }, 400);

      const { data, error } = await supabase
        .from("ecom_product_image_versions")
        .update({ is_current: true })
        .eq("id", versionId)
        .eq("product_id", productId)
        .select("id, path, uploaded_at, is_current")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Version not found");
      }

      await syncPrimaryImage(supabase, productId, data.path, supabaseUrl, bucket);

      return json({
        ok: true,
        current: {
          id: data.id,
          path: data.path,
          uploadedAt: data.uploaded_at,
          isCurrent: data.is_current,
          publicUrl: publicUrl(supabaseUrl, bucket, data.path),
        },
      });
    } catch (error: unknown) {
      return json({ ok: false, error: "revert_failed", message: String((error as Error)?.message ?? error) }, 400);
    }
  }

  return json({ ok: false, error: "bad_op" }, 400);
}

async function syncPrimaryImage(
  supabase: ReturnType<typeof getAdminClient>,
  productId: string,
  path: string,
  supabaseUrl: string,
  bucket: string,
) {
  try {
    const { data, error } = await supabase
      .from("ecom_products")
      .select("images")
      .eq("id", productId)
      .single();
    if (error) throw error;

    const currentImages = Array.isArray(data?.images)
      ? (data.images as unknown[]).map((value) => String(value)).filter(Boolean)
      : [];
    const mainUrl = publicUrl(supabaseUrl, bucket, path);
    const nextImages = [mainUrl, ...currentImages.filter((url) => url !== mainUrl)];

    await supabase
      .from("ecom_products")
      .update({ images: nextImages })
      .eq("id", productId);
  } catch (error) {
    console.warn("syncPrimaryImage failed", error);
  }
}
