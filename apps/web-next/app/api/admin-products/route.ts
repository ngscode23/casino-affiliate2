import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();
const PRODUCT_COLLECTION_TAG = "products:list";
const PRODUCT_TAG_PREFIX = "product:";
const CATEGORY_TAG_PREFIX = "category:";
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || "product-images";

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

function pickSupabaseUrl(): string {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function normalizePath(raw: string, bucket: string): string {
  const trimmed = raw.replace(/^\/+/, "");
  const bucketPrefix = `${bucket}/`;
  if (trimmed.startsWith(bucketPrefix)) {
    return trimmed.slice(bucketPrefix.length);
  }
  return trimmed;
}

function toPublicUrl(baseUrl: string, bucket: string, path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  if (/^https?:/i.test(path)) return path;
  if (!baseUrl) return null;
  const objectPath = normalizePath(path.trim(), bucket)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
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

async function slugExists(
  supabase: ReturnType<typeof getAdminClient>,
  slug: string,
): Promise<boolean> {
  const tables = ["ecom_products", "products"] as const;
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("slug", slug);
      if (error) {
        console.warn(`admin-products: slug lookup failed for ${table}`, error);
        continue;
      }
      if (typeof count === "number" && count > 0) {
        return true;
      }
    } catch (lookupError) {
      console.warn(`admin-products: slug lookup threw for ${table}`, lookupError);
    }
  }
  return false;
}

async function generateUniqueSlug(
  supabase: ReturnType<typeof getAdminClient>,
  base: string,
  taken: Set<string>,
): Promise<string> {
  const normalizedBase = base.trim() ? base.trim() : "product";
  const seeds: string[] = [
    `${normalizedBase}-copy`,
    `${normalizedBase}-copy-${Date.now().toString(36)}`,
    `${normalizedBase}-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  ];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const seed =
      attempt < seeds.length
        ? seeds[attempt]
        : `${normalizedBase}-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${attempt}`;
    const candidate = slugifyTitle(seed);
    if (taken.has(candidate)) continue;
    if (await slugExists(supabase, candidate)) continue;
    taken.add(candidate);
    return candidate;
  }

  throw new Error("failed_to_generate_unique_slug");
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
        .select(
          "id, slug, sku, title, price, rating, images, short_desc, category_slug, tags, specs, status, currency, seller_id, image_path"
        )
        .in("id", ids);
      if (error) return json({ ok: false, error: error.message || "db" }, 500);

      const sourceRows = Array.isArray(data) ? data : [];
      const originalIds = sourceRows
        .map((row) => {
          const value = row?.id;
          return typeof value === "string" ? value : value != null ? String(value) : "";
        })
        .filter(Boolean);

      let legacyById = new Map<string, Record<string, any>>();
      if (originalIds.length) {
        try {
          const { data: legacyRows, error: legacyError } = await supabase
            .from("products")
            .select(
              "id,slug,sku,title,short_desc,description,price,price_cents,currency,status,category_slug,tags,images,image_path,main_image_url,seller_id,rating,created_at"
            )
            .in("id", originalIds);
          if (!legacyError && Array.isArray(legacyRows)) {
            legacyById = new Map(
              legacyRows.map((row: Record<string, any>) => [String(row?.id ?? ""), row]),
            );
          } else if (legacyError) {
            console.warn("admin-products: failed to fetch legacy products", legacyError);
          }
        } catch (legacyErr) {
          console.warn("admin-products: legacy products query threw", legacyErr);
        }
      }

      const imageVersionsByProduct = new Map<
        string,
        Array<{ path: string; source_url: string | null; metadata: unknown; is_current: boolean }>
      >();
      if (originalIds.length) {
        try {
          const { data: versionRows, error: versionError } = await supabase
            .from("ecom_product_image_versions")
            .select("product_id,path,source_url,metadata,is_current")
            .in("product_id", originalIds);
          if (!versionError && Array.isArray(versionRows)) {
            for (const version of versionRows) {
              const productIdRaw = version?.product_id;
              const productId =
                typeof productIdRaw === "string"
                  ? productIdRaw
                  : productIdRaw != null
                    ? String(productIdRaw)
                    : "";
              if (!productId) continue;
              const bucket = imageVersionsByProduct.get(productId) ?? [];
              bucket.push({
                path: String(version?.path ?? ""),
                source_url:
                  typeof version?.source_url === "string" && version.source_url.trim()
                    ? version.source_url
                    : null,
                metadata: version?.metadata ?? null,
                is_current: Boolean(version?.is_current),
              });
              imageVersionsByProduct.set(productId, bucket);
            }
          } else if (versionError) {
            console.warn("admin-products: failed to fetch image versions", versionError);
          }
        } catch (versionsErr) {
          console.warn("admin-products: image versions query threw", versionsErr);
        }
      }

      const takenSlugs = new Set<string>();
      const supabaseUrl = pickSupabaseUrl();
      const nowIso = new Date().toISOString();
      const clones: Array<{
        originalId: string;
        row: {
          id: string;
          title: string;
          price: number;
          rating: number | null;
          images: unknown;
          short_desc: string | null;
          category_slug: string | null;
          tags: unknown;
          specs: unknown;
          status: string;
          slug: string;
          sku: string;
          currency: string | null;
          seller_id: string | null;
          image_path: string | null;
          deleted_at: null;
        };
      }> = [];

      for (const row of sourceRows) {
        const originalIdRaw = row?.id;
        const originalId =
          typeof originalIdRaw === "string"
            ? originalIdRaw
            : originalIdRaw != null
              ? String(originalIdRaw)
              : "";
        if (!originalId) continue;
        const base = String(row.slug || row.title || originalId || "product");
        const uniqueSlug = await generateUniqueSlug(supabase, base, takenSlugs);
        const sourceSku = String(row.sku || row.slug || originalId || uniqueSlug);
        const sku = normalizeSku(`${sourceSku}-copy`, sourceSku);
        clones.push({
          originalId,
          row: {
            id: randomUUID(),
            title: row.title ?? "Untitled",
            price: row.price ?? 0,
            rating: row.rating ?? null,
            images: row.images ?? null,
            short_desc: row.short_desc ?? null,
            category_slug: row.category_slug ?? null,
            tags: row.tags ?? null,
            specs: row.specs ?? null,
            status: "published",
            slug: uniqueSlug,
            sku,
            currency: row.currency ?? null,
            seller_id: row.seller_id ?? null,
            image_path: row.image_path ?? null,
            deleted_at: null,
          },
        });
      }

      if (!clones.length) return json({ ok: true, duplicated: 0 });

      const rows = clones.map((entry) => entry.row);

      const inserted = await supabase.from("ecom_products").insert(rows).select("id");
      if (inserted.error) return json({ ok: false, error: inserted.error.message || "db" }, 500);
      const insertedIds = (inserted.data || []).map((row) => String(row.id));

      const legacyInserts: Array<Record<string, unknown>> = [];
      for (const entry of clones) {
        const legacy = legacyById.get(entry.originalId) ?? null;
        const imagesArray = Array.isArray(entry.row.images)
          ? (entry.row.images as unknown[]).map((value) => String(value)).filter(Boolean)
          : Array.isArray(legacy?.images)
            ? (legacy?.images as unknown[]).map((value) => String(value)).filter(Boolean)
            : [];
        const mainImageUrl =
          (legacy?.main_image_url && String(legacy.main_image_url)) ||
          toPublicUrl(supabaseUrl, DEFAULT_BUCKET, entry.row.image_path) ||
          (imagesArray[0] ?? null);
        const priceCandidate =
          Number.isFinite(entry.row.price) && typeof entry.row.price === "number"
            ? entry.row.price
            : Number.isFinite(Number(legacy?.price))
              ? Number(legacy?.price)
              : 0;
        const price = priceCandidate >= 0 ? priceCandidate : 0;
        const priceCents =
          typeof legacy?.price_cents === "number" && Number.isFinite(legacy.price_cents)
            ? legacy.price_cents
            : Math.round(price * 100);

        legacyInserts.push({
          id: entry.row.id,
          slug: entry.row.slug,
          sku: entry.row.sku,
          title: entry.row.title ?? legacy?.title ?? null,
          short_desc: entry.row.short_desc ?? legacy?.short_desc ?? null,
          description: legacy?.description ?? null,
          price,
          price_cents: priceCents,
          currency: entry.row.currency ?? legacy?.currency ?? null,
          status: entry.row.status ?? legacy?.status ?? null,
          category_slug: entry.row.category_slug ?? legacy?.category_slug ?? null,
          tags: legacy?.tags ?? entry.row.tags ?? null,
          images: legacy?.images ?? entry.row.images ?? null,
          image_path: entry.row.image_path ?? legacy?.image_path ?? null,
          main_image_url: mainImageUrl,
          seller_id: entry.row.seller_id ?? legacy?.seller_id ?? null,
          rating: legacy?.rating ?? entry.row.rating ?? null,
          created_at: nowIso,
        });
      }

      if (legacyInserts.length) {
        try {
          const { error: legacyInsertError } = await supabase.from("products").insert(legacyInserts);
          if (legacyInsertError) {
            console.warn("admin-products: failed to insert legacy products", legacyInsertError);
          }
        } catch (legacyInsertErr) {
          console.warn("admin-products: legacy products insert threw", legacyInsertErr);
        }
      }

      const imageVersionInserts: Array<{
        id: string;
        product_id: string;
        sku: string;
        path: string;
        source_url: string | null;
        metadata: unknown;
        is_current: boolean;
      }> = [];
      for (const entry of clones) {
        const versions = imageVersionsByProduct.get(entry.originalId);
        if (!versions || !versions.length) continue;
        for (const version of versions) {
          if (!version.path) continue;
          imageVersionInserts.push({
            id: randomUUID(),
            product_id: entry.row.id,
            sku: entry.row.sku,
            path: version.path,
            source_url: version.source_url,
            metadata: version.metadata ?? null,
            is_current: version.is_current ?? false,
          });
        }
      }
      if (imageVersionInserts.length) {
        try {
          const { error: copyError } = await supabase
            .from("ecom_product_image_versions")
            .insert(imageVersionInserts);
          if (copyError) {
            console.warn("admin-products: failed to copy image versions", copyError);
          }
        } catch (copyErr) {
          console.warn("admin-products: image versions copy threw", copyErr);
        }
      }

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
