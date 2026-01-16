import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";

type UploadPayload = {
  productId?: unknown;
  sku?: unknown;
  slug?: unknown;
  ext?: unknown;
  filename?: unknown;
  fileName?: unknown;
  name?: unknown;
};

function getSupabaseUrl(): string {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  throw new Error("SUPABASE_URL is not configured");
}

function normalizePathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeExt(input: unknown): string {
  if (typeof input !== "string") return "webp";
  const trimmed = input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!trimmed) return "webp";
  return trimmed.slice(0, 6);
}

function extFromFilename(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || !trimmed.includes(".")) return null;
  const parts = trimmed.split(".");
  const ext = parts.pop();
  return ext ? ext.trim().toLowerCase() : null;
}

function normalizeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function buildPayload(raw: Record<string, unknown>) {
  const filename =
    normalizeString(raw.filename) ||
    normalizeString(raw.fileName) ||
    normalizeString(raw.name) ||
    normalizeString(raw.path);

  return {
    productId:
      normalizeString(raw.productId) ||
      normalizeString(raw.product_id) ||
      normalizeString(raw.product) ||
      normalizeString(raw.id) ||
      undefined,
    sku:
      normalizeString(raw.sku) ||
      normalizeString(raw.sku_id) ||
      undefined,
    slug:
      normalizeString(raw.slug) ||
      normalizeString(raw.product_slug) ||
      undefined,
    ext:
      normalizeString(raw.ext) ||
      (filename ? extFromFilename(filename) ?? undefined : undefined),
  } satisfies UploadPayload;
}

function buildObjectPath(folder: string, ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `main-${timestamp}-${random}.${ext}`;
  return `${folder}/${filename}`.replace(/\/{2,}/g, "/");
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: UploadPayload = {};
  try {
    payload = (await request.json()) as UploadPayload;
  } catch {
    try {
      const form = await request.formData();
      const entries: Record<string, FormDataEntryValue> = {};
      form.forEach((value, key) => {
        entries[key] = value;
      });
      payload = buildPayload(entries as Record<string, unknown>);
    } catch {
      payload = {};
    }
  }

  if (payload && typeof payload === "object") {
    payload = buildPayload(payload as Record<string, unknown>);
  }

  const sku = typeof payload.sku === "string" ? payload.sku.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
  const base = sku || slug || productId || "product";
  const folder = normalizePathSegment(base) || "product";
  const ext = normalizeExt(payload.ext);
  const objectPath = buildObjectPath(folder, ext);

  try {
    const supabaseUrl = getSupabaseUrl();
    const supabase = getAdminClient();
    const storage = supabase.storage.from(DEFAULT_BUCKET);

    const { data, error } = await storage.createSignedUploadUrl(objectPath, { upsert: true });
    if (error || !data?.signedUrl) {
      throw error ?? new Error("Failed to create signed upload url");
    }

    const signedUrl = data.signedUrl;
    const uploadUrl = signedUrl.startsWith("http")
      ? signedUrl
      : `${supabaseUrl.replace(/\/$/, "")}${signedUrl.startsWith("/") ? signedUrl : `/${signedUrl}`}`;
    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(
      DEFAULT_BUCKET,
    )}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;

    return json({
      ok: true,
      bucket: DEFAULT_BUCKET,
      path: objectPath,
      uploadUrl,
      token: data.token,
      publicUrl,
    });
  } catch (error: any) {
    return json(
      { ok: false, error: "upload_url_error", message: error?.message ?? "Failed to create upload url" },
      500,
    );
  }
}

export function GET() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
