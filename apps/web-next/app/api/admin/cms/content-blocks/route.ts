import type { Json } from "@shared/lib/database.types";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase";

type ContentBlockPayload = {
  id?: unknown;
  locale?: unknown;
  type?: unknown;
  slug?: unknown;
  status?: unknown;
  content?: unknown;
  content_json?: unknown;
  valueMode?: unknown;
  published_at?: unknown;
};

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeStatus(status: unknown): "draft" | "published" | "archived" {
  const normalized = normalizeString(status).toLowerCase();
  if (normalized === "published" || normalized === "archived") {
    return normalized as "published" | "archived";
  }
  return "draft";
}

function parseContent(payload: ContentBlockPayload): Json {
  if (payload.content_json !== undefined) return payload.content_json as Json;
  const raw = payload.content;
  const mode =
    typeof payload.valueMode === "string" ? payload.valueMode.toLowerCase() : undefined;

  if (typeof raw === "string") {
    if (mode === "text") return raw;
    try {
      return JSON.parse(raw) as Json;
    } catch (error) {
      if (mode === "json") {
        throw new Error("content_parse_error");
      }
      return raw;
    }
  }

  if (raw === null || raw === undefined) return {};
  if (typeof raw === "object") return raw as Json;
  return raw as Json;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: ContentBlockPayload;
  try {
    payload = (await request.json()) as ContentBlockPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const locale = normalizeString(payload.locale) || "en";
  const type = normalizeString(payload.type);
  if (!type) {
    return json({ ok: false, error: "type_required" }, 400);
  }

  const slugString = normalizeString(payload.slug);
  const slug = slugString ? slugString : undefined;
  const status = normalizeStatus(payload.status);

  let contentJson: Json;
  try {
    contentJson = parseContent(payload);
  } catch (error: any) {
    if (error?.message === "content_parse_error") {
      return json({ ok: false, error: "content_parse_error" }, 400);
    }
    return json({ ok: false, error: "content_invalid" }, 400);
  }

  const publishTimestamp =
    typeof payload.published_at === "string" && payload.published_at.trim()
      ? new Date(payload.published_at).toISOString()
      : null;

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-content-blocks");
  const now = new Date().toISOString();

  let blockId =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : null;

  if (!blockId) {
    const { data: createdId, error: createError } = await supabase.rpc(
      "cms_create_block",
      {
        p_locale: locale,
        p_type: type,
        p_content: contentJson,
        p_status: status,
        p_slug: slug,
      },
    );

    if (createError || !createdId) {
      return json(
        {
          ok: false,
          error: "create_failed",
          message: createError?.message ?? "Failed to create content block",
        },
        500,
      );
    }
    blockId = String(createdId);
  } else {
    const { error: updateError } = await supabase
      .from("content_blocks")
      .update({
        locale,
        type,
        slug: slug ?? null,
        status,
        content_json: contentJson,
        updated_at: now,
        updated_by: auth.user.id ?? null,
      })
      .eq("id", blockId);

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
    .from("content_blocks")
    .select("*")
    .eq("id", blockId)
    .single();

  if (loadError) {
    return json(
      { ok: false, error: "load_failed", message: loadError.message },
      500,
    );
  }

  try {
    if (status === "published") {
      await supabase.rpc("cms_publish_block", {
        p_block_id: blockId,
        p_when: publishTimestamp ?? now,
      });
    } else if (status === "draft") {
      await supabase.rpc("cms_unpublish_block", {
        p_block_id: blockId,
      });
    } else {
      await supabase.rpc("cms_enqueue_publish", {
        p_target: "tag:content",
        p_action: "revalidate",
        p_payload: {
          type: "content_block",
          id: blockId,
          status,
        },
      });
    }
  } catch (publishError) {
    console.warn("[cms][content-blocks] publish helper failed", publishError);
  }

  return json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ContentBlockPayload;
  try {
    payload = (await request.json()) as ContentBlockPayload;
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

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-content-blocks");

  const { data, error } = await supabase
    .from("content_blocks")
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
        type: "content_block",
        id,
        status: "deleted",
      },
    });
  } catch (publishError) {
    console.warn("[cms][content-blocks] enqueue publish failed", publishError);
  }

  return json({ ok: true, deleted: true });
}
