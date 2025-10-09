"use client";

import { getValidAccessToken } from "@shared/lib/auth";

export async function authorizedRequest(path: string, adminToken: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  const headers = new Headers(init?.headers ?? {});
  headers.set("accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (adminToken) headers.set("x-admin-token", adminToken);
  const url = path.startsWith("http") ? path : new URL(path, window.location.origin).toString();
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export async function callPayments(path: string, body: unknown, adminToken: string) {
  const response = await authorizedRequest(`/api/payments${path}`, adminToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `payments ${path} ${response.status}`);
  }
  return response.json();
}

