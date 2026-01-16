import { GET as imagesGet, POST as imagesPost } from "@/app/api/admin/shop/products/images/route";

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = normalizeString(url.searchParams.get("product_id"));
  if (productId && !url.searchParams.get("productId")) {
    url.searchParams.set("productId", productId);
  }

  const nextRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers,
  });
  return imagesGet(nextRequest);
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

  const mapped = {
    ...payload,
    productId:
      normalizeString(payload.productId) ??
      normalizeString(payload.product_id) ??
      null,
    versionId:
      normalizeString(payload.versionId) ??
      normalizeString(payload.version_id) ??
      null,
    sourceUrl:
      normalizeString(payload.sourceUrl) ??
      normalizeString(payload.source_url) ??
      null,
  };

  const headers = new Headers(request.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const nextRequest = new Request(
    request.url.replace("/api/admin-product-images", "/api/admin/shop/products/images"),
    {
      method: "POST",
      headers,
      body: JSON.stringify(mapped),
    },
  );

  return imagesPost(nextRequest);
}
