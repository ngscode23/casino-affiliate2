import type { Category } from "@shared/ecom/lib/types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export async function getCategories(): Promise<Category[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[catalog:categories] missing Supabase configuration");
    return [];
  }

  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/ecom_categories?select=slug,name,icon&order=name.asc`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
  };

  const response = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let details: any = null;
    try {
      details = await response.json();
    } catch {
      /* ignore json parse errors */
    }

    const message =
      (details && (details.message || details.error)) ||
      `Failed to load categories (${response.status})`;
    console.warn("[catalog:categories] request failed", {
      status: response.status,
      message,
      details,
    });
    throw new Error(message);
  }

  const rows = (await response.json()) as Array<{ slug: string; name: string; icon?: string | null }>;
  return rows.map((row) => ({
    id: row.slug,
    slug: row.slug,
    name: row.name,
    icon: row.icon ?? undefined,
  }));
}

export default getCategories;

