import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase";

type PageSectionPayload = {
  id?: unknown;
  page_path?: unknown;
  locale?: unknown;
  block_id?: unknown;
  sort_order?: unknown;
  is_draft?: unknown;
  isDraft?: unknown;
  visible?: unknown;
  published_at?: unknown;
};

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: PageSectionPayload;
  try {
    payload = (await request.json()) as PageSectionPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const pagePath = normalizeString(payload.page_path);
  if (!pagePath) {
    return json({ ok: false, error: "page_path_required" }, 400);
  }

  const locale = normalizeString(payload.locale) || "en";
  const blockId = normalizeString(payload.block_id);
  if (!blockId) {
    return json({ ok: false, error: "block_id_required" }, 400);
  }

  const sortOrderRaw =
    typeof payload.sort_order === "number"
      ? payload.sort_order
      : Number(payload.sort_order ?? 0);
  const sortOrder = Number.isFinite(sortOrderRaw)
    ? Math.round(sortOrderRaw)
    : 0;

  const isDraft = toBoolean(
    payload.is_draft ?? payload.isDraft,
    false,
  );
  const visible = toBoolean(payload.visible, true);

  const publishAtRaw =
    typeof payload.published_at === "string" && payload.published_at.trim()
      ? new Date(payload.published_at).toISOString()
      : undefined;

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-page-sections");
  const now = new Date().toISOString();

  let sectionId =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : null;

  if (!sectionId) {
    const { data: createdId, error: createError } = await supabase.rpc(
      "cms_attach_section",
      {
        p_page_path: pagePath,
        p_locale: locale,
        p_block_id: blockId,
        p_sort_order: sortOrder,
        p_is_draft: isDraft,
        p_visible: visible,
        p_published_at: publishAtRaw,
      },
    );

    if (createError || !createdId) {
      return json(
        {
          ok: false,
          error: "create_failed",
          message: createError?.message ?? "Failed to create page section",
        },
        500,
      );
    }
    sectionId = String(createdId);
  } else {
    const { error: updateError } = await supabase
      .from("page_sections")
      .update({
        page_path: pagePath,
        locale,
        block_id: blockId,
        sort_order: sortOrder,
        is_draft: isDraft,
        visible,
        updated_at: now,
        updated_by: auth.user.id ?? null,
      })
      .eq("id", sectionId);

    if (updateError) {
      return json(
        {
          ok: false,
          error: "upsert_failed",
          message: updateError.message,
        },
        500,
      );
    }
  }

  const { data, error: loadError } = await supabase
    .from("page_sections")
    .select("*")
    .eq("id", sectionId)
    .single();

  if (loadError) {
    return json(
      { ok: false, error: "load_failed", message: loadError.message },
      500,
    );
  }

  try {
    if (!isDraft && visible) {
      await supabase.rpc("cms_publish_section", {
        p_section_id: sectionId,
        p_when: publishAtRaw ?? now,
      });
    } else {
      await supabase.rpc("cms_unpublish_section", { p_section_id: sectionId });
    }
  } catch (publishError) {
    console.warn("[cms][page-sections] publish helper failed", publishError);
  }

  return json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: PageSectionPayload;
  try {
    payload = (await request.json()) as PageSectionPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : "";

  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-page-sections");

  const { data, error } = await supabase
    .from("page_sections")
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
      p_target: "tag:content",
      p_action: "revalidate",
      p_payload: {
        type: "page_section",
        id,
        page_path: data.page_path ?? null,
      },
    });
  } catch (publishError) {
    console.warn("[cms][page-sections] enqueue publish failed", publishError);
  }

  return json({ ok: true, deleted: true });
}
