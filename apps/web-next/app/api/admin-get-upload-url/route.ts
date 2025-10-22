import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku } from "@shared/lib/normalize";

const DEFAULT_BUCKET = "product-images";
const PRODUCT_COLLECTION_TAG = "products:list";
const PRODUCT_TAG_PREFIX = "product:";
const CATEGORY_TAG_PREFIX = "category:";
const allowedExt = new Set(["webp", "png", "jpg", "jpeg", "avif"]);
function productTag(slug: string) {
  return `${PRODUCT_TAG_PREFIX}${slug}`;
}

function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}


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
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
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

async function revalidateProductsByIds(
  supabase: ReturnType<typeof getAdminClient>,
  ids: string[],
) {
  if (!ids.length) {
    revalidateTag(PRODUCT_COLLECTION_TAG);
    return;
  }

  const productTags = new Set<string>();
  const categoryTags = new Set<string>();

  try {
    const { data } = await supabase
      .from("products")
      .select("slug, category_slug")
      .in("id", ids);
    for (const row of data ?? []) {
      const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
      if (slug) productTags.add(productTag(slug));
      const category = typeof row?.category_slug === "string" ? row.category_slug.trim() : "";
      if (category) categoryTags.add(categoryTag(category));
    }
  } catch (error) {
    console.warn("admin-get-upload-url: tag resolution failed", error);
  }

  for (const tag of productTags) {
    revalidateTag(tag);
  }
  for (const tag of categoryTags) {
    revalidateTag(tag);
  }
  revalidateTag(PRODUCT_COLLECTION_TAG);
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
      const touchedIds = new Set<string>();
      if (skuRaw) {
        const { data: skuRows, error: updateErr } = await supabase
          .from("ecom_products")
          .update({ image_path: objectPath })
          .eq("sku", skuRaw)
          .select("id");
        if (updateErr) throw updateErr;
        updated = skuRows?.length ?? 0;
        for (const row of skuRows ?? []) {
          if (row?.id) touchedIds.add(String(row.id));
        }
      }
      if (!updated && slugRaw) {
        const { data: slugRows, error: updateErr } = await supabase
          .from("ecom_products")
          .update({ image_path: objectPath })
          .eq("slug", slugRaw)
          .select("id");
        if (updateErr) throw updateErr;
        updated = slugRows?.length ?? 0;
        for (const row of slugRows ?? []) {
          if (row?.id) touchedIds.add(String(row.id));
        }
      }
      if (!updated && productId) {
        const { data: idRows, error: updateErr } = await supabase
          .from("ecom_products")
          .update({ image_path: objectPath })
          .eq("id", productId)
          .select("id");
        if (updateErr) throw updateErr;
        for (const row of idRows ?? []) {
          if (row?.id) touchedIds.add(String(row.id));
        }
      }
      await revalidateProductsByIds(supabase, Array.from(touchedIds));
    } catch (updateErr) {
      console.warn("admin-get-upload-url: failed to update ecom_products", updateErr);
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
