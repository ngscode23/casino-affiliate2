import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("include_inactive") !== "false";
    const includeChildren = url.searchParams.get("include_children") === "true";

    const supabase = getAdminClient();
    let query = supabase
      .from("categories")
      .select("slug,title,description,parent_id,sort_order,is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (!includeChildren) {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;

    if (error) return json({ ok: false, error: error.message || "db" }, 500);

    const items = Array.isArray(data)
      ? data.map((item) => ({
          slug: item.slug,
          name: item.title ?? item.slug,
          title: item.title ?? item.slug,
          description: item.description ?? null,
          parent_id: item.parent_id ?? null,
          sort_order: typeof item.sort_order === "number" ? item.sort_order : null,
          is_active: Boolean(item.is_active),
        }))
      : [];

    return json({ ok: true, items });
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
