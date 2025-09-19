// netlify/functions/admin-products.ts
// Admin-only endpoint for products mutations (status updates, upsert, delete, duplicate).
// Auth: requires x-admin-token matching ADMIN_TOKEN env var.

import type { Handler } from "@netlify/functions";
import { getServiceClient } from "../lib/shared/auth/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function deny(statusCode = 403) {
  return { statusCode, headers: { "cache-control": "no-store" }, body: "" };
}

export const handler: Handler = async (event) => {
  try {
    const token = (event.headers["x-admin-token"] || event.headers["X-Admin-Token"]) as string | undefined;
    const isDev = process.env.NETLIFY_DEV === "true" || process.env.NODE_ENV !== "production";
    // In production: require exact token match.
    // In dev: allow if ADMIN_TOKEN is not set; if set, still enforce match.
    if (!isDev) {
      if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return deny(403);
    } else {
      if (ADMIN_TOKEN && token !== ADMIN_TOKEN) return deny(403);
    }
    if (event.httpMethod !== "POST") return deny(405);

    const payload = JSON.parse(event.body || "{}");
    const op = String(payload?.op || "");
    const sb = getServiceClient() as any;

    // --- helpers to keep product_catalog in sync ---
    async function syncCatalog(ids: string[]) {
      if (!ids.length) return;
      // подтягиваем id/title/slug из ecom_products и апсертим в product_catalog
      const { data, error } = await sb
        .from("ecom_products")
        .select("id, title, slug")
        .in("id", ids);
      if (error) throw new Error(error.message);
      const rows = (data || []).map((r: any) => ({
        source_schema: "public",
        source_table: "ecom_products",
        source_pk: String(r.id),
        title: r.title ?? null,
        slug: r.slug ?? null,
      }));
      if (!rows.length) return;
      try {
        await sb.from("product_catalog").upsert(rows, {
          onConflict: "source_schema,source_table,source_pk",
        });
      } catch (_e) {
        // table may not exist; ignore catalog sync failures
      }
    }

    async function dropFromCatalog(ids: string[]) {
      if (!ids.length) return;
      // это снесёт соответствия; за ними каскадом удалятся отзывы/статы (FK reviews_unified -> product_catalog on delete cascade)
      try {
        await sb
          .from("product_catalog")
          .delete()
          .eq("source_schema", "public")
          .eq("source_table", "ecom_products")
          .in("source_pk", ids.map(String));
      } catch (_e) {
        // ignore if product_catalog is absent
      }
    }

    if (op === "status") {
      const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
      const status = String(payload?.status || "");
      if (!ids.length) return json({ ok: true, updated: 0 });

      const { error, count, data } = await sb
        .from("ecom_products")
        .update({ status })
        .in("id", ids)
        .select("id", { count: "exact" });
      if (error) return json({ error: "db" }, 500);

      // статус не влияет на каталог, но если ты правишь title/slug в этом же запросе — можешь раскомментировать:
      // await syncCatalog((data || []).map((r: any) => r.id));

      return json({ ok: true, updated: count ?? 0 });
    }

    if (op === "upsert") {
      const product = payload?.product || {};
      const { data, error } = await sb.from("ecom_products").upsert(product).select("id").single();
      if (error) return json({ error: error.message || "db" }, 500);

      // каталог: гарантируем запись для нового/обновлённого товара
      await syncCatalog([data.id]);
      return json({ ok: true, id: data?.id });
    }

    if (op === "delete") {
      const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
      if (!ids.length) return json({ ok: true, deleted: 0 });

      // сначала удалим из каталога (тем самым каскадом снесём отзывы/статы именно по этим товарам)
      await dropFromCatalog(ids);

      const { error, count } = await sb.from("ecom_products").delete().in("id", ids).select("id", { count: "exact" });
      if (error) return json({ error: "db" }, 500);
      return json({ ok: true, deleted: count ?? 0 });
    }

    if (op === "duplicate") {
      const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
      if (!ids.length) return json({ ok: true, duplicated: 0 });

      const { data, error } = await sb
        .from("ecom_products")
        .select("id, slug, title, price, rating, images, short_desc, category_slug, tags, specs, status")
        .in("id", ids);
      if (error) return json({ error: "db" }, 500);

      const rows = (data || []).map((r: any) => ({
        ...r,
        id: undefined,
        slug: `${r.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        created_at: undefined,
      }));
      const ins = await sb.from("ecom_products").insert(rows).select("id");
      if (ins.error) return json({ error: "db" }, 500);

      // добавим новинки в каталог
      await syncCatalog((ins.data || []).map((r: any) => r.id));
      return json({ ok: true, duplicated: (ins.data || []).length });
    }

    return json({ error: "bad_op" }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
};

export default handler;
