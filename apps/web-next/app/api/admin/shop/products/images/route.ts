import { json } from "@/app/api/orders/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";

type ImageOpPayload = {
  op?: string;
  productId?: unknown;
  versionId?: unknown;
  sku?: unknown;
  path?: unknown;
  sourceUrl?: unknown;
};

function normalizeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function pickSupabaseUrl(): string {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function normalizePath(raw: string, bucket: string): string {
  const trimmed = raw.replace(/^\/+/, "");
  const bucketPrefix = `${bucket}/`;
  if (trimmed.startsWith(bucketPrefix)) {
    return trimmed.slice(bucketPrefix.length);
  }
  return trimmed;
}

function toPublicUrl(baseUrl: string, bucket: string, path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  if (/^https?:/i.test(path)) return path.trim();
  if (!baseUrl) return null;
  const objectPath = normalizePath(path.trim(), bucket)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

function mapVersion(row: Record<string, unknown>, supabaseUrl: string, bucket: string) {
  const sourceUrl = normalizeString(row.source_url);
  const path = normalizeString(row.path);
  const publicUrl = sourceUrl || toPublicUrl(supabaseUrl, bucket, path) || null;
  return {
    id: row.id,
    path: path || null,
    publicUrl,
    uploadedAt: row.uploaded_at ?? row.uploadedAt ?? null,
    uploadedBy: row.uploaded_by ?? row.uploadedBy ?? null,
    isCurrent: Boolean(row.is_current ?? row.isCurrent ?? false),
    sourceUrl: sourceUrl || null,
  };
}

function normalizeImageArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((value) => normalizeString(value)).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => normalizeString(value)).filter(Boolean);
      }
    } catch {
      // ignore malformed json
    }
  }
  return [];
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const productId = normalizeString(url.searchParams.get("productId"));
  if (!productId) {
    return json({ ok: false, error: "product_id_required" }, 400);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("ecom_product_image_versions")
    .select("id, product_id, sku, path, uploaded_at, uploaded_by, is_current, source_url, metadata")
    .eq("product_id", productId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  const supabaseUrl = pickSupabaseUrl();
  const versions = Array.isArray(data)
    ? data.map((row) => mapVersion(row as Record<string, unknown>, supabaseUrl, DEFAULT_BUCKET))
    : [];
  return json({ ok: true, versions }, 200);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ImageOpPayload;
  try {
    payload = (await request.json()) as ImageOpPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const op = normalizeString(payload.op || "record").toLowerCase();
  const productId = normalizeString(payload.productId);
  const versionId = normalizeString(payload.versionId);
  const sku = normalizeString(payload.sku);
  const path = normalizeString(payload.path);
  const sourceUrl = normalizeString(payload.sourceUrl);

  if (!productId) {
    return json({ ok: false, error: "product_id_required" }, 400);
  }

  const supabase = getAdminClient();

  if (op === "record") {
    if (!path) {
      return json({ ok: false, error: "path_required" }, 400);
    }
    await supabase
      .from("ecom_product_image_versions")
      .update({ is_current: false })
      .eq("product_id", productId);

    const insertPayload = {
      product_id: productId,
      sku: sku || null,
      path,
      source_url: sourceUrl || null,
      uploaded_by: auth.user.id,
      is_current: true,
      uploaded_via: "admin",
    };

    const { data, error } = await supabase
      .from("ecom_product_image_versions")
      .insert(insertPayload)
      .select("id, product_id, sku, path, uploaded_at, uploaded_by, is_current, source_url")
      .maybeSingle();

    if (error) {
      return json({ ok: false, error: "insert_failed", message: error.message }, 500);
    }
    if (!data) {
      return json({ ok: false, error: "not_found" }, 404);
    }

    const supabaseUrl = pickSupabaseUrl();
    const version = mapVersion(data as Record<string, unknown>, supabaseUrl, DEFAULT_BUCKET);
    try {
      const publicUrl = version.publicUrl;
      let catalogSlug = "";
      if (publicUrl) {
        const { data: productRow } = await supabase
          .from("ecom_products")
          .select("images, catalog_product_id")
          .eq("id", productId)
          .maybeSingle();

        const currentImages = normalizeImageArray((productRow as any)?.images);
        const nextImages = [publicUrl, ...currentImages.filter((url) => url !== publicUrl)];

        await supabase
          .from("ecom_products")
          .update({ images: nextImages })
          .eq("id", productId);

        const catalogProductId = normalizeString((productRow as any)?.catalog_product_id);
        if (catalogProductId) {
          const { data: catalogRow } = await supabase
            .from("catalog_products")
            .select("slug")
            .eq("id", catalogProductId)
            .maybeSingle();
          catalogSlug = normalizeString((catalogRow as any)?.slug);
          await supabase
            .from("catalog_products")
            .update({ thumbnail_url: publicUrl })
            .eq("id", catalogProductId)
            .or("thumbnail_url.is.null,thumbnail_url.eq.");
        }
      }
      try {
        revalidateTag("products:list", {});
        if (catalogSlug) revalidateTag(`product:${catalogSlug}`, {});
        revalidatePath("/");
        if (catalogSlug) revalidatePath(`/products/${catalogSlug}`);
      } catch (revalidateError) {
        console.warn("[admin-shop-images] revalidate failed", revalidateError);
      }
    } catch (syncError) {
      console.warn("[admin-shop-images] sync failed", syncError);
    }
    return json({ ok: true, version }, 200);
  }

  if (op === "revert") {
    if (!versionId) {
      return json({ ok: false, error: "version_id_required" }, 400);
    }

    await supabase
      .from("ecom_product_image_versions")
      .update({ is_current: false })
      .eq("product_id", productId);

    const { data, error } = await supabase
      .from("ecom_product_image_versions")
      .update({ is_current: true })
      .eq("id", versionId)
      .eq("product_id", productId)
      .select("id, product_id, sku, path, uploaded_at, uploaded_by, is_current, source_url")
      .maybeSingle();

    if (error) {
      return json({ ok: false, error: "update_failed", message: error.message }, 500);
    }
    if (!data) {
      return json({ ok: false, error: "not_found" }, 404);
    }

    const supabaseUrl = pickSupabaseUrl();
    const current = mapVersion(data as Record<string, unknown>, supabaseUrl, DEFAULT_BUCKET);
    return json({ ok: true, current }, 200);
  }

  if (op === "delete") {
    if (!versionId) {
      return json({ ok: false, error: "version_id_required" }, 400);
    }
    const { error } = await supabase
      .from("ecom_product_image_versions")
      .delete()
      .eq("id", versionId)
      .eq("product_id", productId);
    if (error) {
      return json({ ok: false, error: "delete_failed", message: error.message }, 500);
    }
    return json({ ok: true }, 200);
  }

  return json({ ok: false, error: "unsupported_op" }, 400);
}
