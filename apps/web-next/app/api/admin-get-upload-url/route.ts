import { POST as uploadPost } from "@/app/api/admin/shop/products/upload-url/route";

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extFromName(name: string | null): string | null {
  if (!name) return null;
  const parts = name.split(".");
  if (parts.length < 2) return null;
  const ext = parts.pop();
  return ext ? ext.trim().toLowerCase() : null;
}

export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }

  const filename =
    normalizeString(payload.filename) ??
    normalizeString(payload.fileName) ??
    normalizeString(payload.name) ??
    normalizeString(payload.path) ??
    null;

  const mapped = {
    productId:
      normalizeString(payload.productId) ??
      normalizeString(payload.product_id) ??
      normalizeString(payload.product) ??
      normalizeString(payload.id) ??
      null,
    sku: normalizeString(payload.sku) ?? normalizeString(payload.sku_id) ?? null,
    slug: normalizeString(payload.slug) ?? normalizeString(payload.product_slug) ?? null,
    ext: normalizeString(payload.ext) ?? extFromName(filename),
  };

  const headers = new Headers(request.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const nextRequest = new Request(
    request.url.replace("/api/admin-get-upload-url", "/api/admin/shop/products/upload-url"),
    {
      method: "POST",
      headers,
      body: JSON.stringify(mapped),
    },
  );

  return uploadPost(nextRequest);
}

export function GET() {
  return new Response(null, { status: 405 });
}
