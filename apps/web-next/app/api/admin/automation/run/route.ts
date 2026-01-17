import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const QUEUE_TABLE = "automation_queue" as any;
const UNMAPPED_TABLE = "supplier_feed_unmapped" as any;

const GTIN_KEYS = ["gtin", "ean", "upc", "barcode", "gtin14", "gtin13", "ean13", "upca"];
const MPN_KEYS = ["mpn", "manufacturer_part_number", "mfr_part_number", "part_number"];

type RunPayload = {
  supplier_id?: string;
  limit?: number;
  seed_unmapped?: boolean;
  auto_create?: boolean;
  dry_run?: boolean;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeDigits(input: string): string {
  return input.replace(/\D+/g, "");
}

function normalizeMpn(input: string): string {
  return input.trim().toUpperCase();
}

function parseNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const parsed = Number(input.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCurrency(input: unknown, fallback = "USD"): string {
  if (typeof input === "string" && input.trim()) return input.trim().toUpperCase();
  return fallback;
}

function findInPayload(payload: Record<string, unknown> | null, keys: string[]): string | null {
  if (!payload) return null;
  const sources: Array<Record<string, unknown> | null | undefined> = [
    payload,
    payload.identifiers as Record<string, unknown> | null | undefined,
    payload.attributes as Record<string, unknown> | null | undefined,
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value =
        source[key] ?? source[key.toLowerCase()] ?? source[key.toUpperCase()] ?? source[key.replace(/_/g, "")];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

async function resolveSupplierCurrency(supplierId: string): Promise<string> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("suppliers").select("default_currency").eq("id", supplierId).maybeSingle();
  const currency = normalizeString((data as any)?.default_currency ?? "");
  return currency ? currency.toUpperCase() : "USD";
}

async function findVendorSkuMapping(params: {
  supabase: ReturnType<typeof getAdminClient>;
  supplierId: string;
  vendorSku: string;
}) {
  const { supabase, supplierId, vendorSku } = params;
  const { data } = await supabase
    .from("supplier_skus")
    .select("id, sku_id, supplier_sku")
    .eq("supplier_id", supplierId)
    .eq("supplier_sku", vendorSku)
    .maybeSingle();
  return data as { id: string; sku_id: string; supplier_sku: string } | null;
}

async function resolveUniqueSkuAndSlug(params: {
  supabase: ReturnType<typeof getAdminClient>;
  baseSlug: string;
  baseSku: string;
}) {
  const { supabase, baseSlug, baseSku } = params;
  const { data } = await supabase
    .from("ecom_products")
    .select("id, slug, sku")
    .or(`slug.eq.${baseSlug},sku.eq.${baseSku}`)
    .limit(5);
  const rows = Array.isArray(data) ? data : [];
  const skuMatch = rows.find((row) => normalizeString((row as any).sku) === baseSku);
  const slugMatch = rows.find((row) => normalizeString((row as any).slug) === baseSlug);
  if (!skuMatch && !slugMatch) {
    return { slug: baseSlug, sku: baseSku };
  }

  for (let i = 2; i <= 6; i += 1) {
    const nextSlug = `${baseSlug}-${i}`;
    const nextSku = normalizeSku(`${baseSku}-${i}`, baseSku);
    const { data: conflictRows } = await supabase
      .from("ecom_products")
      .select("id")
      .or(`slug.eq.${nextSlug},sku.eq.${nextSku}`)
      .limit(1);
    if (!Array.isArray(conflictRows) || conflictRows.length === 0) {
      return { slug: nextSlug, sku: nextSku };
    }
  }

  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    slug: `${baseSlug}-${suffix}`,
    sku: normalizeSku(`${baseSku}-${suffix}`, baseSku),
  };
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: RunPayload;
  try {
    payload = (await request.json()) as RunPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const supplierId = normalizeString(payload.supplier_id);
  const limit = Number.isFinite(Number(payload.limit)) ? Math.max(1, Math.min(200, Number(payload.limit))) : 50;
  const seedUnmapped = Boolean(payload.seed_unmapped);
  const autoCreate = Boolean(payload.auto_create);
  const dryRun = Boolean(payload.dry_run);

  const supabase = getAdminClient();

  let seeded = 0;
  if (seedUnmapped) {
    let unmappedQuery = supabase.from(UNMAPPED_TABLE).select("supplier_id, vendor_sku, sample_payload");
    if (supplierId) unmappedQuery = unmappedQuery.eq("supplier_id", supplierId);
    const { data: unmappedRows, error: unmappedError } = await unmappedQuery;
    if (unmappedError) {
      return json({ ok: false, error: "seed_failed", message: unmappedError.message }, 500);
    }
    const rows = (unmappedRows ?? []).map((row: any) => ({
      supplier_id: row.supplier_id,
      vendor_sku: row.vendor_sku,
      status: "pending",
      payload_snapshot: row.sample_payload ?? {},
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error: upsertError } = await supabase
        .from(QUEUE_TABLE)
        .upsert(rows, { onConflict: "supplier_id,vendor_sku" });
      if (upsertError) {
        return json({ ok: false, error: "seed_failed", message: upsertError.message }, 500);
      }
      seeded = rows.length;
    }
  }

  let queueQuery = supabase.from(QUEUE_TABLE).select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(limit);
  if (supplierId) queueQuery = queueQuery.eq("supplier_id", supplierId);
  const { data: queueRows, error: queueError } = await queueQuery;
  if (queueError) {
    return json({ ok: false, error: "queue_fetch_failed", message: queueError.message }, 500);
  }

  const processed: any[] = [];
  let matched = 0;
  let created = 0;
  let conflicts = 0;
  let errors = 0;

  for (const row of queueRows ?? []) {
    const queueId = String((row as any).id);
    const queueSupplierId = normalizeString((row as any).supplier_id);
    const vendorSku = normalizeString((row as any).vendor_sku);
    const payloadSnapshot = ((row as any).payload_snapshot ?? {}) as Record<string, unknown>;

    if (!queueSupplierId || !vendorSku) {
      errors += 1;
      if (!dryRun) {
        await supabase
          .from(QUEUE_TABLE)
          .update({ status: "error", reason: "missing_vendor_sku", updated_at: new Date().toISOString() })
          .eq("id", queueId);
      }
      processed.push({ id: queueId, status: "error", reason: "missing_vendor_sku" });
      continue;
    }

    const gtinRaw = findInPayload(payloadSnapshot, GTIN_KEYS);
    const mpnRaw = findInPayload(payloadSnapshot, MPN_KEYS);
    const brandRaw = findInPayload(payloadSnapshot, ["brand", "manufacturer", "maker"]);

    const gtin = gtinRaw ? normalizeDigits(gtinRaw) : null;
    const mpn = mpnRaw ? normalizeMpn(mpnRaw) : null;
    const brand = brandRaw ? normalizeString(brandRaw) : null;

    const candidateSet = new Set<string>();
    let matchedSkuId: string | null = null;

    if (gtin) {
      const { data: rows } = await supabase
        .from("product_attributes")
        .select("product_id")
        .in("key", GTIN_KEYS)
        .eq("value", gtin)
        .limit(10);
      const ids = (rows ?? []).map((item: any) => String(item.product_id)).filter(Boolean);
      ids.forEach((id) => candidateSet.add(id));
      if (ids.length === 1) {
        matchedSkuId = ids[0];
      }
    }

    if (!matchedSkuId && mpn) {
      const { data: rows } = await supabase
        .from("product_attributes")
        .select("product_id")
        .in("key", MPN_KEYS)
        .ilike("value", mpn)
        .limit(20);
      const ids = (rows ?? []).map((item: any) => String(item.product_id)).filter(Boolean);
      ids.forEach((id) => candidateSet.add(id));

      let filtered = ids;
      if (brand) {
        const { data: brandRows } = await supabase
          .from("product_attributes")
          .select("product_id")
          .eq("key", "brand")
          .ilike("value", brand)
          .in("product_id", ids);
        const brandIds = (brandRows ?? []).map((item: any) => String(item.product_id)).filter(Boolean);
        if (brandIds.length) filtered = brandIds;
      }

      if (filtered.length === 1) {
        matchedSkuId = filtered[0];
      }
    }

    if (!matchedSkuId && candidateSet.size > 1) {
      conflicts += 1;
      if (!dryRun) {
        await supabase
          .from(QUEUE_TABLE)
          .update({
            status: "conflict",
            reason: "multiple_matches",
            candidate_skus: Array.from(candidateSet),
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueId);
      }
      processed.push({
        id: queueId,
        status: "conflict",
        reason: "multiple_matches",
        candidate_skus: Array.from(candidateSet),
      });
      continue;
    }

    if (!matchedSkuId && !autoCreate) {
      conflicts += 1;
      if (!dryRun) {
        await supabase
          .from(QUEUE_TABLE)
          .update({
            status: "conflict",
            reason: "no_match",
            candidate_skus: [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueId);
      }
      processed.push({ id: queueId, status: "conflict", reason: "no_match" });
      continue;
    }

    let finalSkuId = matchedSkuId;
    let finalStatus: "matched" | "created" = "matched";

    if (!matchedSkuId && autoCreate) {
      const title =
        normalizeString(payloadSnapshot.title) ||
        normalizeString(payloadSnapshot.name) ||
        normalizeString(payloadSnapshot.product_title) ||
        normalizeString(payloadSnapshot.product_name) ||
        normalizeString(payloadSnapshot.model) ||
        normalizeString(payloadSnapshot.item) ||
        vendorSku;
      const baseSlug = slugifyTitle(title, vendorSku);
      const baseSku = normalizeSku(vendorSku || baseSlug, title);
      const { slug, sku } = await resolveUniqueSkuAndSlug({ supabase, baseSlug, baseSku });

      const priceCentsRaw = parseNumber(payloadSnapshot.price_cents ?? payloadSnapshot.priceCents ?? null);
      const priceRaw = parseNumber(payloadSnapshot.price ?? null);
      const priceCents =
        priceCentsRaw != null ? Math.round(priceCentsRaw) : priceRaw != null ? Math.round(priceRaw * 100) : 0;
      const currency = normalizeCurrency(payloadSnapshot.currency, await resolveSupplierCurrency(queueSupplierId));

      if (!dryRun) {
        const { data: createdSku, error: createError } = await supabase
          .from("ecom_products")
          .insert({
            title,
            slug,
            sku,
            price: priceCents / 100,
            price_cents: priceCents,
            currency,
            status: "draft",
          })
          .select("id")
          .maybeSingle();
        if (createError || !createdSku) {
          errors += 1;
          await supabase
            .from(QUEUE_TABLE)
            .update({ status: "error", reason: "create_failed", updated_at: new Date().toISOString() })
            .eq("id", queueId);
          processed.push({ id: queueId, status: "error", reason: "create_failed" });
          continue;
        }
        finalSkuId = String((createdSku as any).id);
        finalStatus = "created";
      } else {
        finalSkuId = "dry-run";
        finalStatus = "created";
      }
    }

    if (!finalSkuId) {
      conflicts += 1;
      if (!dryRun) {
        await supabase
          .from(QUEUE_TABLE)
          .update({ status: "conflict", reason: "no_match", updated_at: new Date().toISOString() })
          .eq("id", queueId);
      }
      processed.push({ id: queueId, status: "conflict", reason: "no_match" });
      continue;
    }

    const existingMapping = await findVendorSkuMapping({
      supabase,
      supplierId: queueSupplierId,
      vendorSku,
    });

    if (existingMapping?.sku_id && existingMapping.sku_id !== finalSkuId) {
      conflicts += 1;
      if (!dryRun) {
        await supabase
          .from(QUEUE_TABLE)
          .update({
            status: "conflict",
            reason: "vendor_sku_already_mapped",
            candidate_skus: [existingMapping.sku_id, finalSkuId],
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueId);
      }
      processed.push({
        id: queueId,
        status: "conflict",
        reason: "vendor_sku_already_mapped",
        candidate_skus: [existingMapping.sku_id, finalSkuId],
      });
      continue;
    }

    if (!dryRun) {
      const currency = normalizeCurrency(payloadSnapshot.currency, await resolveSupplierCurrency(queueSupplierId));
      const costCentsRaw = parseNumber(payloadSnapshot.cost_cents ?? payloadSnapshot.cost ?? null);
      const leadTimeRaw = parseNumber(payloadSnapshot.lead_time_days ?? payloadSnapshot.lead_time ?? null);

      const { error: mapError } = await supabase.from("supplier_skus").upsert(
        {
          supplier_id: queueSupplierId,
          sku_id: finalSkuId,
          supplier_sku: vendorSku,
          cost_cents: costCentsRaw != null ? Math.round(costCentsRaw) : null,
          currency,
          lead_time_days: leadTimeRaw != null ? Math.round(leadTimeRaw) : null,
        },
        { onConflict: "supplier_id,sku_id" },
      );
      if (mapError) {
        errors += 1;
        await supabase
          .from(QUEUE_TABLE)
          .update({ status: "error", reason: "mapping_failed", updated_at: new Date().toISOString() })
          .eq("id", queueId);
        processed.push({ id: queueId, status: "error", reason: "mapping_failed" });
        continue;
      }

      await supabase
        .from(QUEUE_TABLE)
        .update({
          status: finalStatus,
          reason: null,
          sku_id: finalSkuId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);
    }

    if (finalStatus === "created") created += 1;
    else matched += 1;
    processed.push({ id: queueId, status: finalStatus, sku_id: finalSkuId });
  }

  return json(
    {
      ok: true,
      seeded,
      processed: (queueRows ?? []).length,
      matched,
      created,
      conflicts,
      errors,
      dry_run: dryRun,
      items: processed,
    },
    200,
  );
}
