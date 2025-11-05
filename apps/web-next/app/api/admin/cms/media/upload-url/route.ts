import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = "public-media";

type UploadPayload = {
  bucket?: unknown;
  folder?: unknown;
  filename?: unknown;
  contentType?: unknown;
};

function getSupabaseUrl(): string {
  const candidates = [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];
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
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "")
    .replace(/^\/+|\/+$/g, "");
}

function buildObjectPath(folder: string | null, filename: string | null): string {
  const safeFolder = folder ? `/${normalizePathSegment(folder)}` : "";
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now();
  let baseName = filename ? filename.trim().replace(/\s+/g, "-") : `asset-${timestamp}`;
  if (!baseName.includes(".")) {
    baseName = `${baseName}.webp`;
  }
  return `${safeFolder}/${timestamp}-${random}-${baseName}`
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "");
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: UploadPayload;
  try {
    payload = (await request.json()) as UploadPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const bucket =
    (typeof payload.bucket === "string" && payload.bucket.trim()) ||
    process.env.SUPABASE_PUBLIC_MEDIA_BUCKET ||
    DEFAULT_BUCKET;

  const folder =
    typeof payload.folder === "string" && payload.folder.trim()
      ? payload.folder.trim()
      : null;
  const filename =
    typeof payload.filename === "string" && payload.filename.trim()
      ? payload.filename.trim()
      : null;

  const objectPath = buildObjectPath(folder, filename);

  try {
    const supabaseUrl = getSupabaseUrl();
    const supabase = getAdminClient();
    const storage = supabase.storage.from(bucket);

    const { data, error } = await storage.createSignedUploadUrl(objectPath, {
      upsert: true,
    });

    if (error || !data?.signedUrl) {
      throw error ?? new Error("Failed to create signed upload url");
    }

    const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}${data.signedUrl}`;
    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(
      bucket,
    )}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;

    return json({
      ok: true,
      bucket,
      path: objectPath,
      uploadUrl,
      token: data.token,
      publicUrl,
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: "upload_url_error",
        message: error?.message ?? "Failed to create upload url",
      },
      500,
    );
  }
}
