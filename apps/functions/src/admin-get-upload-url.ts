import type { Handler } from "@netlify/functions";
import { requireAdmin } from "@shared/netlify/shared/auth/guard";
import { json, error, methodNotAllowed } from "@shared/netlify/shared/auth/http";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import { normalizeSku } from "@shared/netlify/shared/normalize";

const DEFAULT_BUCKET = "product-images";
const allowedExt = new Set(["webp", "png", "jpg", "jpeg", "avif"]);

function resolveExt(input?: string | null): string {
  if (typeof input !== "string" || !input.trim()) return "webp";
  let ext = input.trim().toLowerCase();
  if (ext.includes("/")) {
    // content-type like image/png
    const [, subtype] = ext.split("/");
    if (subtype) ext = subtype;
  }
  ext = ext.replace(/[^a-z0-9]/g, "");
  if (ext === "jpeg") ext = "jpg";
  if (!allowedExt.has(ext)) return "webp";
  return ext;
}

function toAbsoluteUrl(base: string, path: string): string {
  if (/^https?:/i.test(path)) return path;
  const normalizedBase = base.replace(/\/$/, "");
  if (!path.startsWith("/")) {
    return `${normalizedBase}/${path}`;
  }
  return `${normalizedBase}${path}`;
}

function encodeObjectPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

export const handler: Handler = async (event) => {
  if ((event.httpMethod || "").toUpperCase() !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  const auth = await requireAdmin(event);
  if ("response" in auth) return auth.response;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return error(500, "misconfig", "SUPABASE_URL is not configured");

  const bucket = process.env.SUPABASE_PRODUCT_BUCKET || DEFAULT_BUCKET;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return error(400, "bad_json", "Invalid JSON body");
  }

  const productId = typeof payload?.productId === "string" ? payload.productId.trim() : "";
  const skuRaw = typeof payload?.sku === "string" ? payload.sku.trim() : "";
  const slugRaw = typeof payload?.slug === "string" ? payload.slug.trim() : "";
  if (!productId && !skuRaw && !slugRaw) {
    return error(400, "bad_request", "productId and/or sku required");
  }

  const extHint = typeof payload?.ext === "string" ? payload.ext : undefined;
  const ext = resolveExt(extHint);
  const normalizedSku = normalizeSku(skuRaw || slugRaw || productId);
  const safeFolder = normalizedSku.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '') || 'product';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const objectPath = `${safeFolder}/main-${timestamp}-${random}.${ext}`;

  try {
    const supabase = getServiceClient();
    const storage = supabase.storage.from(bucket);

    const { data, error: signedErr } = await storage.createSignedUploadUrl(objectPath, { upsert: true });
    if (signedErr || !data?.signedUrl) {
      throw signedErr ?? new Error("Failed to create signed upload url");
    }

    try {
      let updated = 0;
      if (skuRaw) {
        const { data: rows, error: updateErr } = await supabase
          .from("shop.products")
          .update({ image_path: objectPath })
          .eq("sku", skuRaw)
          .select("id");
        if (updateErr) throw updateErr;
        updated = rows?.length ? rows.length : 0;
      }

      if (!updated && slugRaw) {
        const { data: rows, error: updateErr } = await supabase
          .from("shop.products")
          .update({ image_path: objectPath })
          .eq("slug", slugRaw)
          .select("id");
        if (updateErr) throw updateErr;
        updated = rows?.length ? rows.length : 0;
      }

      if (!updated && productId) {
        const { data: rows, error: updateErr } = await supabase
          .from("shop.products")
          .update({ image_path: objectPath })
          .eq("id", productId)
          .select("id");
        if (updateErr) throw updateErr;
        updated = rows?.length ? rows.length : 0;
      }

      if (!updated) {
        console.warn("admin-get-upload-url: no shop.products row matched. sku=%s slug=%s id=%s", skuRaw, slugRaw, productId);
      }
    } catch (updateErr) {
      console.warn("admin-get-upload-url: failed to update shop.products", updateErr);
    }

    const uploadUrl = toAbsoluteUrl(supabaseUrl, data.signedUrl);
    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;

    return json({
      ok: true,
      uploadUrl,
      token: data.token,
      path: objectPath,
      publicUrl,
      bucket,
    });
  } catch (err: any) {
    return error(500, "upload_url_error", err?.message || "upload url error");
  }
};

export default handler;

