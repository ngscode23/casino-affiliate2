import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();
const PRODUCT_COLLECTION_TAG = "products:list";
const PRODUCT_TAG_PREFIX = "product:";
const CATEGORY_TAG_PREFIX = "category:";

function productTag(slug: string) {
  return `${PRODUCT_TAG_PREFIX}${slug}`;
}

function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}

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

async function revalidateProducts(
  supabase: ReturnType<typeof getAdminClient>,
  ids: string[],
  knownSlugs: string[] = [],
  knownCategories: string[] = [],
) {
  const slugSet = new Set(
    knownSlugs
      .map((slug) => (typeof slug === "string" ? slug.trim() : ""))
      .filter(Boolean),
  );
  const categoryTags = new Set<string>();

  for (const category of knownCategories) {
    const normalized = typeof category === "string" ? category.trim() : "";
    if (normalized) categoryTags.add(categoryTag(normalized));
  }

  if (ids.length) {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, slug, category_slug")
        .in("id", ids);
      for (const row of data ?? []) {
        const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
        if (slug) slugSet.add(slug);
        const categorySlug = typeof row?.category_slug === "string" ? row.category_slug.trim() : "";
        if (categorySlug) categoryTags.add(categoryTag(categorySlug));
      }
    } catch (error) {
      console.warn("admin-products: tag resolution failed", error);
    }
  }

  for (const slug of slugSet) {
    revalidateTag(productTag(slug));
  }
  for (const tag of categoryTags) {
    revalidateTag(tag);
  }
  revalidateTag(PRODUCT_COLLECTION_TAG);
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
      await revalidateProducts(supabase, updatedIds);
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
      await revalidateProducts(supabase, [String(data.id)], [normalizedSlug]);
      return json({ ok: true, id: data.id });
    }

    if (op === "delete") {
      const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
      if (!ids.length) return json({ ok: true, deleted: 0 });
      const { data: existingProducts } = await supabase
        .from("products")
        .select("slug, category_slug")
        .in("id", ids);
      await dropFromCatalog(supabase, ids);
      try {
        const { error: mapError } = await supabase
          .from("product_id_map")
          .delete()
          .in("current_product_id", ids);
        if (mapError) {
          console.warn("admin-products: failed to clean product_id_map", mapError);
        }
      } catch (mapError) {
        console.warn("admin-products: product_id_map cleanup threw", mapError);
      }
      try {
        const { error: orderItemsError } = await supabase
          .from("order_items")
          .update({ product_id: null })
          .in("product_id", ids);
        if (orderItemsError) {
          console.warn("admin-products: failed to null order_items.product_id", orderItemsError);
        }
      } catch (orderItemsError) {
        console.warn("admin-products: order_items cleanup threw", orderItemsError);
      }
      const { error, data: deletedData } = await supabase
        .from("ecom_products")
        .delete()
        .in("id", ids)
        .select("id");
      if (error) return json({ ok: false, error: error.message || "db" }, 500);
      const fallbackSlugs =
        existingProducts?.map((row: any) => (typeof row?.slug === "string" ? row.slug.trim() : "")).filter(Boolean) ??
        [];
      const fallbackCategories =
        existingProducts?.map((row: any) => (typeof row?.category_slug === "string" ? row.category_slug.trim() : "")).filter(Boolean) ??
        [];
      await revalidateProducts(supabase, [], fallbackSlugs, fallbackCategories);
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
      const insertedIds = (inserted.data || []).map((row) => String(row.id));
      await syncCatalog(supabase, insertedIds);
      const newSlugs = rows.map((row) => (typeof row.slug === "string" ? row.slug : "")).filter(Boolean);
      const newCategories = rows
        .map((row) => (typeof row.category_slug === "string" ? row.category_slug : ""))
        .filter(Boolean);
      await revalidateProducts(supabase, insertedIds, newSlugs, newCategories);
      return json({ ok: true, duplicated: inserted.data?.length ?? 0 });
    }

    return json({ ok: false, error: "bad_op" }, 400);
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
