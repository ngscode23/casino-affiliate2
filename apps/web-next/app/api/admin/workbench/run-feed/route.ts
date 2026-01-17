import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const payload = await request.json().catch(() => ({}));
  const url = new URL("/api/admin/supplier-feed/run", request.url);

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  return json(body, response.status);
}
