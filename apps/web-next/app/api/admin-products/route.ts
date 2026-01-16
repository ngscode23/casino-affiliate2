import { GET as shopGet, POST as shopPost } from "@/app/api/admin/shop/products/route";

export const GET = shopGet;

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const normalized =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  // Allow legacy callers that posted the product payload directly.
  const body =
    normalized.op || normalized.product
      ? normalized
      : { op: "upsert", product: normalized };

  const headers = new Headers(request.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const nextRequest = new Request(request.url.replace("/api/admin-products", "/api/admin/shop/products"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return shopPost(nextRequest);
}
