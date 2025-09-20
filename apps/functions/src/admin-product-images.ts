import type { Handler } from "@netlify/functions";
import { requireAdmin } from "@shared/netlify/shared/auth/guard";
import { json, error, methodNotAllowed } from "@shared/netlify/shared/auth/http";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

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

export const handler: Handler = async (event) => {
  const auth = await requireAdmin(event);
  if ("response" in auth) return auth.response;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return error(500, "misconfig", "SUPABASE_URL missing");
  const bucket = process.env.SUPABASE_PRODUCT_BUCKET || DEFAULT_BUCKET;

  const supabase = getServiceClient();

  if ((event.httpMethod || "GET").toUpperCase() === "GET") {
    const productId = (event.queryStringParameters?.productId || "").trim();
    if (!productId) return error(400, "bad_request", "productId required");

    const { data, error: listError } = await supabase
      .from("ecom_product_image_versions")
      .select("id, path, uploaded_at, uploaded_by, is_current, source_url, metadata")
      .eq("product_id", productId)
      .order("uploaded_at", { ascending: false })
      .limit(50);

    if (listError) return error(500, "db", listError.message);

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

  if ((event.httpMethod || "POST").toUpperCase() !== "POST") {
    return methodNotAllowed(["GET", "POST"]);
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return error(400, "bad_json", "Invalid JSON body");
  }

  const op = String(body.op || "record");

  async function ensureProductId(): Promise<{ productId: string; sku: string }> {
    let productId = (body.productId || "").trim();
    const skuRaw = (body.sku || "").trim();
    if (productId) {
      return { productId, sku: skuRaw || productId };
    }

    const matchValue = (body.slug || skuRaw || "").trim();
    if (!matchValue) {
      throw new Error("productId or sku/slug required");
    }

    const { data, error: lookupError } = await supabase
      .from("ecom_products")
      .select("id, sku")
      .or(`sku.eq.${matchValue},slug.eq.${matchValue}`)
      .limit(1)
      .maybeSingle();
    if (lookupError || !data) {
      throw new Error("Product not found for provided identifier");
    }
    return { productId: data.id, sku: data.sku || matchValue };
  }

  if (op === "record") {
    try {
      const { productId, sku } = await ensureProductId();
      const path = String(body.path || "").trim();
      if (!path) return error(400, "bad_request", "path required");

      const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null;
      const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata : null;

      const { data: insertData, error: insertError } = await supabase
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
      if (insertError) throw insertError;

      await syncPrimaryImage(supabase, productId, path, supabaseUrl, bucket);

      return json({
        ok: true,
        version: {
          id: insertData.id,
          path: insertData.path,
          uploadedAt: insertData.uploaded_at,
          isCurrent: insertData.is_current,
          publicUrl: publicUrl(supabaseUrl, bucket, insertData.path),
        },
      });
    } catch (err: any) {
      return error(400, "record_failed", err?.message || "Failed to record image version");
    }
  }

  if (op === "revert") {
    try {
      const { productId } = await ensureProductId();
      const versionId = String(body.versionId || "").trim();
      if (!versionId) return error(400, "bad_request", "versionId required");

      const { data: versionRow, error: updateError } = await supabase
        .from("ecom_product_image_versions")
        .update({ is_current: true })
        .eq("id", versionId)
        .eq("product_id", productId)
        .select("id, path, uploaded_at, is_current")
        .single();
      if (updateError || !versionRow) {
        throw updateError ?? new Error("Version not found");
      }

      await syncPrimaryImage(supabase, productId, versionRow.path, supabaseUrl, bucket);

      return json({
        ok: true,
        current: {
          id: versionRow.id,
          path: versionRow.path,
          uploadedAt: versionRow.uploaded_at,
          isCurrent: versionRow.is_current,
          publicUrl: publicUrl(supabaseUrl, bucket, versionRow.path),
        },
      });
    } catch (err: any) {
      return error(400, "revert_failed", err?.message || "Failed to revert image");
    }
  }

  return error(400, "bad_op", "Unsupported operation");
};

async function syncPrimaryImage(
  supabase: ReturnType<typeof getServiceClient>,
  productId: string,
  path: string,
  supabaseUrl: string,
  bucket: string,
) {
  try {
    const { data: productRow, error: fetchError } = await (supabase as any)
      .from("ecom_products")
      .select("images")
      .eq("id", productId)
      .single();
    if (fetchError) throw fetchError;

    const currentImages = Array.isArray(productRow?.images)
      ? (productRow.images as any[]).map((value) => String(value)).filter(Boolean)
      : [];
    const mainUrl = publicUrl(supabaseUrl, bucket, path);
    const nextImages = [mainUrl, ...currentImages.filter((url) => url !== mainUrl)];

    await (supabase as any)
      .from("ecom_products")
      .update({ images: nextImages })
      .eq("id", productId);
  } catch (err) {
    console.warn("syncPrimaryImage failed", err);
  }
}

export default handler;

