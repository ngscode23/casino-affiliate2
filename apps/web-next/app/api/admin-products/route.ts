import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();

function json(body: unknown, init?: number) {
  return NextResponse.json(body, {
    status: init ?? 200,
    headers: { "cache-control": "no-store" },
  });
}

async function syncCatalog(supabase: ReturnType<typeof getAdminClient>, ids: string[]) {
  if (!ids.length) return;
  const { data, error } = await supabase
    .from("ecom_products")
    .select("id, title, slug")
    .in("id", ids);
  if (error || !data || !data.length) return;
  const rows = data.map((row) => ({
    source_schema: "public",
    source_table: "ecom_products",
    source_pk: String(row.id),
    title: row.title ?? null,
    slug: row.slug ?? null,
  }));
  try {
    await supabase
      .from("product_catalog")
      .upsert(rows, { onConflict: "source_schema,source_table,source_pk" });
  } catch {
    // catalog table is optional
  }
}

async function dropFromCatalog(supabase: ReturnType<typeof getAdminClient>, ids: string[]) {
  if (!ids.length) return;
  try {
    await supabase
      .from("product_catalog")
      .delete()
      .eq("source_schema", "public")
      .eq("source_table", "ecom_products")
      .in("source_pk", ids.map(String));
  } catch {
    // ignore when catalog is absent
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const headerToken = (request.headers.get("x-admin-token") ?? request.headers.get("X-Admin-Token"))?.trim() || null;
    const enforce = process.env.ENFORCE_ADMIN_TOKEN === "1" || process.env.NODE_ENV === "production";
    if (enforce) {
      if (!ADMIN_TOKEN || headerToken !== ADMIN_TOKEN) {
        return json({ ok: false, error: "unauthorized" }, 403);
      }
    }

    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }

    const op = String(payload.op || "").trim();
    if (!op) return json({ ok: false, error: "bad_op" }, 400);

    const supabase = getAdminClient();

    if (op === "status") {
      const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
      const status = typeof payload.status === "string" ? payload.status.trim() : "";
      if (!ids.length || !status) return json({ ok: true, updated: 0 });
      const { error, data } = await supabase
        .from("ecom_products")
        .update({ status })
        .in("id", ids)
        .select("id");
      if (error) return json({ ok: false, error: error.message || "db" }, 500);
      const updatedIds = (data || []).map((row) => row.id as string);
      await syncCatalog(supabase, updatedIds);
      return json({ ok: true, updated: updatedIds.length });
    }

    if (op === "upsert") {
      const product = (payload.product ?? {}) as Record<string, unknown>;
      const title = typeof product.title === "string" ? product.title.trim() : "";
      if (!title) return json({ ok: false, error: "title_required" }, 400);
      const normalizedSku = normalizeSku(product.sku as string | undefined, title);
      const normalizedSlug = slugifyTitle((product.slug as string | undefined) ?? title, normalizedSku);

      const upsertPayload = {
        ...product,
        title,
        sku: normalizedSku,
        slug: normalizedSlug,
      };

      const { data, error } = await supabase
        .from("ecom_products")
        .upsert(upsertPayload)
        .select("id")
        .single();
      if (error || !data) return json({ ok: false, error: error?.message || "db" }, 500);

      await syncCatalog(supabase, [String(data.id)]);
      return json({ ok: true, id: data.id });
    }

    if (op === "delete") {
      const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
      if (!ids.length) return json({ ok: true, deleted: 0 });
      await dropFromCatalog(supabase, ids);
      const { error, data: deletedData } = await supabase
        .from("ecom_products")
        .delete()
        .in("id", ids)
        .select("id");
      if (error) return json({ ok: false, error: error.message || "db" }, 500);
      return json({ ok: true, deleted: deletedData?.length ?? 0 });
    }

    if (op === "duplicate") {
      const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
      if (!ids.length) return json({ ok: true, duplicated: 0 });
      const { data, error } = await supabase
        .from("ecom_products")
        .select("id, slug, sku, title, price, rating, images, short_desc, category_slug, tags, specs, status")
        .in("id", ids);
      if (error) return json({ ok: false, error: error.message || "db" }, 500);

      const rows = (data || []).map((row) => {
        const baseSlug = slugifyTitle(`${row.slug || row.id}-copy-${Math.random().toString(36).slice(2, 6)}`, row.slug || row.id);
        return {
          ...row,
          id: undefined,
          created_at: undefined,
          slug: baseSlug,
          sku: normalizeSku(`${row.sku || row.slug || row.id}-copy`, row.slug || row.id),
        };
      });

      if (!rows.length) return json({ ok: true, duplicated: 0 });
      const inserted = await supabase.from("ecom_products").insert(rows).select("id");
      if (inserted.error) return json({ ok: false, error: inserted.error.message || "db" }, 500);
      await syncCatalog(supabase, (inserted.data || []).map((row) => String(row.id)));
      return json({ ok: true, duplicated: inserted.data?.length ?? 0 });
    }

    return json({ ok: false, error: "bad_op" }, 400);
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
