import { randomUUID } from "crypto";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase";

type NavigationReorderUpdate = {
  id: string;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
};

type NavigationPayload = {
  id?: unknown;
  locale?: unknown;
  menu?: unknown;
  label?: unknown;
  url?: unknown;
  is_external?: unknown;
  published?: unknown;
  sort_order?: unknown;
  parent_id?: unknown;
};

type ReorderPayload = {
  items?: Array<{
    id?: unknown;
    sort_order?: unknown;
  }>;
};

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return fallback;
    return value !== 0;
  }
  if (value === null || value === undefined) return fallback;
  return fallback;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: NavigationPayload;
  try {
    payload = (await request.json()) as NavigationPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const locale = normalizeString(payload.locale) || "en";
  const menu = normalizeString(payload.menu);
  const label = normalizeString(payload.label);
  const url = normalizeString(payload.url);

  if (!menu) {
    return json({ ok: false, error: "menu_required" }, 400);
  }
  if (!label) {
    return json({ ok: false, error: "label_required" }, 400);
  }
  if (!url) {
    return json({ ok: false, error: "url_required" }, 400);
  }

  const id =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : randomUUID();

  const sortOrderRaw =
    typeof payload.sort_order === "number"
      ? payload.sort_order
      : Number(payload.sort_order ?? 0);
  const sortOrder = Number.isFinite(sortOrderRaw)
    ? Math.round(sortOrderRaw)
    : 0;

  const isExternal = toBoolean(payload.is_external, url.startsWith("http"));
  const published = toBoolean(payload.published, true);
  const parentId =
    typeof payload.parent_id === "string" && payload.parent_id.trim()
      ? payload.parent_id.trim()
      : null;

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-navigation");
  const now = new Date().toISOString();

  const record = {
    id,
    locale,
    menu,
    label,
    url,
    is_external: isExternal,
    published,
    parent_id: parentId,
    sort_order: sortOrder,
    updated_at: now,
    updated_by: auth.user.id ?? null,
  };

  if (typeof payload.id !== "string" || !payload.id.trim()) {
    Object.assign(record, { created_by: auth.user.id ?? null });
  }

  const { data, error } = await supabase
    .from("navigation_links")
    .upsert(record, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    return json(
      { ok: false, error: "upsert_failed", message: error.message },
      500,
    );
  }

  try {
    await supabase.rpc("cms_enqueue_publish", {
      p_target: "tag:nav",
      p_action: "revalidate",
      p_payload: {
        type: "navigation",
        menu,
        locale,
      },
    });
  } catch (publishError) {
    console.warn("[cms][navigation] enqueue publish failed", publishError);
  }

  return json({ ok: true, item: data });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: ReorderPayload;
  try {
    payload = (await request.json()) as ReorderPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    return json({ ok: false, error: "items_required" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-navigation");
  const now = new Date().toISOString();

  const updates: NavigationReorderUpdate[] = [];
  for (const item of items) {
    const id =
      typeof item.id === "string" && item.id.trim() ? item.id.trim() : null;
    if (!id) continue;
    const orderRaw =
      typeof item.sort_order === "number"
        ? item.sort_order
        : Number(item.sort_order ?? 0);
    const sortOrder = Number.isFinite(orderRaw)
      ? Math.round(orderRaw)
      : 0;
    updates.push({
      id,
      sort_order: sortOrder,
      updated_at: now,
      updated_by: auth.user.id ?? null,
    });
  }

  if (!updates.length) {
    return json({ ok: false, error: "items_required" }, 400);
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("navigation_links")
      .update({
        sort_order: update.sort_order,
        updated_at: update.updated_at,
        updated_by: update.updated_by,
      })
      .eq("id", update.id);

    if (error) {
      return json(
        { ok: false, error: "reorder_failed", message: error.message },
        500,
      );
    }
  }

  try {
    await supabase.rpc("cms_enqueue_publish", {
      p_target: "tag:nav",
      p_action: "revalidate",
      p_payload: { type: "navigation" },
    });
  } catch (publishError) {
    console.warn("[cms][navigation] enqueue publish failed", publishError);
  }

  return json({ ok: true, updated: updates.length });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: NavigationPayload;
  try {
    payload = (await request.json()) as NavigationPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-navigation");

  const { data, error } = await supabase
    .from("navigation_links")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return json(
      { ok: false, error: "delete_failed", message: error.message },
      500,
    );
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  try {
    await supabase.rpc("cms_enqueue_publish", {
      p_target: "tag:nav",
      p_action: "revalidate",
      p_payload: {
        type: "navigation",
        menu: data.menu ?? null,
        locale: data.locale ?? null,
      },
    });
  } catch (publishError) {
    console.warn("[cms][navigation] enqueue publish failed", publishError);
  }

  return json({ ok: true, deleted: true });
}
