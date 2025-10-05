import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku } from "@shared/lib/normalize";

const DEFAULT_BUCKET = "product-images";
const allowedExt = new Set(["webp", "png", "jpg", "jpeg", "avif"]);

function resolveExt(input?: string | null): string {
  if (typeof input !== "string" || !input.trim()) return "webp";
  let ext = input.trim().toLowerCase();
  if (ext.includes("/")) {
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

function getSupabaseUrl(): string {
  const candidates = [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  throw new Error("SUPABASE_URL is not configured");
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: code, message },
    { status, headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabaseUrl = (() => {
    try {
      return getSupabaseUrl();
    } catch (error: any) {
      throw new Error(error?.message ?? "SUPABASE_URL is not configured");
    }
  })();
  const bucket = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || DEFAULT_BUCKET;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "bad_json", "Invalid JSON body");
  }

  const productId = typeof payload?.productId === "string" ? payload.productId.trim() : "";
  const skuRaw = typeof payload?.sku === "string" ? payload.sku.trim() : "";
  const slugRaw = typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!productId && !skuRaw && !slugRaw) {
    return jsonError(400, "bad_request", "productId and/or sku required");
  }

  const extHint = typeof payload?.ext === "string" ? payload.ext : undefined;
  const ext = resolveExt(extHint);
  const normalizedSku = normalizeSku(skuRaw || slugRaw || productId);
  const safeFolder = normalizedSku
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const objectPath = `${safeFolder}/main-${timestamp}-${random}.${ext}`;

  try {
    const supabase = getAdminClient();
    const storage = supabase.storage.from(bucket);
    const { data, error } = await storage.createSignedUploadUrl(objectPath, { upsert: true });
    if (error || !data?.signedUrl) {
      throw error ?? new Error("Failed to create signed upload url");
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
        updated = rows?.length ?? 0;
      }
      if (!updated && slugRaw) {
        const { data: rows, error: updateErr } = await supabase
          .from("shop.products")
          .update({ image_path: objectPath })
          .eq("slug", slugRaw)
          .select("id");
        if (updateErr) throw updateErr;
        updated = rows?.length ?? 0;
      }
      if (!updated && productId) {
        const { data: rows, error: updateErr } = await supabase
          .from("shop.products")
          .update({ image_path: objectPath })
          .eq("id", productId)
          .select("id");
        if (updateErr) throw updateErr;
      }
    } catch (updateErr) {
      console.warn("admin-get-upload-url: failed to update shop.products", updateErr);
    }

    const uploadUrl = toAbsoluteUrl(supabaseUrl, data.signedUrl ?? "");
    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;

    return NextResponse.json(
      {
        ok: true,
        uploadUrl,
        token: data.token,
        path: objectPath,
        publicUrl,
        bucket,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (error: any) {
    return jsonError(500, "upload_url_error", error?.message ?? "upload url error");
  }
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}