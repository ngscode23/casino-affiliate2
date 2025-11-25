// @ts-nocheck
import { serve } from "std/http/server.ts";
import { createClient, type PostgrestSingleResponse } from "@supabase/supabase-js";

type EventRow = {
  anon_id: string;
  event: string;
  product_id?: string | null;
  category?: string | null;
  price_bucket?: string | null;
  device?: string | null;
  country?: string | null;
  ts: string;
  experiment_variant?: string | null;
};

type Aggregate = {
  anonId: string;
  lastSeen: string;
  days: Set<string>;
  categoryCounts: Map<string, number>;
  countryCounts: Map<string, number>;
  deviceCounts: Map<string, number>;
  discountClicks: number;
  clickEvents: number;
  experimentVariant: string | null;
};

const supabaseUrl =
  Deno.env.get("SB_URL") ??
  Deno.env.get("SUPABASE_URL") ??
  Deno.env.get("SUPABASE_PROJECT_URL");
const serviceKey =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY");

const WINDOW_DAYS = Number(Deno.env.get("PROFILE_WINDOW_DAYS") || "30");
const BATCH_LIMIT = Number(Deno.env.get("PROFILE_BATCH_SIZE") || "5000");

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY for build-profiles function");
}

serve(async (req) => {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dry_run") === "true";
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const optOutIds = await fetchOptOutIds(client);
  const eventsRes = await client
    .from("user_events")
    .select("anon_id,event,product_id,category,price_bucket,device,country,ts,experiment_variant")
    .gte("ts", sinceIso)
    .order("ts", { ascending: true })
    .limit(BATCH_LIMIT);

  if (eventsRes.error) {
    return jsonResponse({ ok: false, error: eventsRes.error.message }, 500);
  }

  const events = (eventsRes.data ?? []) as EventRow[];
  const aggregates = new Map<string, Aggregate>();

  for (const ev of events) {
    if (!ev?.anon_id) continue;
    if (optOutIds.has(ev.anon_id)) continue;
    const agg = aggregates.get(ev.anon_id) ?? createAggregate(ev);
    updateAggregate(agg, ev);
    aggregates.set(ev.anon_id, agg);
  }

  const nowIso = new Date().toISOString();
  const payload = Array.from(aggregates.values()).map((agg) => {
    const categories = topKeys(agg.categoryCounts, 6);
    const countries = topKeys(agg.countryCounts, 5);
    const device_pref = topKeys(agg.deviceCounts, 1)[0] ?? null;
    const visit_count = agg.days.size || 1;
    const discount_affinity =
      agg.clickEvents > 0 ? Math.min(1, agg.discountClicks / agg.clickEvents) : 0;

    return {
      anon_id: agg.anonId,
      last_seen: agg.lastSeen,
      updated_at: nowIso,
      visit_count,
      device_pref,
      countries,
      categories,
      discount_affinity,
      cold_start: false,
      experiment_variant: agg.experimentVariant,
    };
  });

  if (dryRun) {
    return jsonResponse({
      ok: true,
      dryRun: true,
      candidates: payload.length,
      windowDays: WINDOW_DAYS,
      events: events.length,
    });
  }

  const { error: upsertError } = await client
    .from("user_profiles")
    .upsert(payload, { onConflict: "anon_id" });

  if (upsertError) {
    return jsonResponse({ ok: false, error: upsertError.message }, 500);
  }

  return jsonResponse({
    ok: true,
    updated: payload.length,
    windowDays: WINDOW_DAYS,
    events: events.length,
  });
});

function createAggregate(ev: EventRow): Aggregate {
  const ts = new Date(ev.ts ?? Date.now()).toISOString();
  return {
    anonId: ev.anon_id,
    lastSeen: ts,
    days: new Set([ts.slice(0, 10)]),
    categoryCounts: new Map(),
    countryCounts: new Map(),
    deviceCounts: new Map(),
    discountClicks: 0,
    clickEvents: 0,
    experimentVariant: ev.experiment_variant ?? null,
  };
}

function updateAggregate(agg: Aggregate, ev: EventRow) {
  const ts = new Date(ev.ts ?? Date.now()).toISOString();
  if (ts > agg.lastSeen) agg.lastSeen = ts;
  agg.days.add(ts.slice(0, 10));

  if (ev.category) {
    bump(agg.categoryCounts, ev.category);
  }
  if (ev.country) {
    bump(agg.countryCounts, ev.country.toLowerCase());
  }
  if (ev.device) {
    bump(agg.deviceCounts, ev.device);
  }
  if (isClickEvent(ev.event)) {
    agg.clickEvents += 1;
    if (isDiscountEvent(ev)) {
      agg.discountClicks += 1;
    }
  }
  if (!agg.experimentVariant && ev.experiment_variant) {
    agg.experimentVariant = ev.experiment_variant;
  }
}

function isClickEvent(eventName: string | null | undefined): boolean {
  if (!eventName) return false;
  return /click/i.test(eventName);
}

function isDiscountEvent(ev: EventRow): boolean {
  const name = (ev.event || "").toLowerCase();
  if (name.includes("discount") || name.includes("sale") || name.includes("promo")) return true;
  const priceBucket = (ev.price_bucket || "").toLowerCase();
  if (priceBucket === "discounted" || priceBucket === "sale") return true;
  return false;
}

async function fetchOptOutIds(
  client: ReturnType<typeof createClient>,
): Promise<Set<string>> {
  const res: PostgrestSingleResponse<{ anon_id: string }[]> = await client
    .from("user_profiles")
    .select("anon_id")
    .eq("opt_out", true);
  if (res.error) return new Set();
  return new Set((res.data ?? []).map((row) => row.anon_id).filter(Boolean));
}

function bump(map: Map<string, number>, key: string) {
  const next = (map.get(key) ?? 0) + 1;
  map.set(key, next);
}

function topKeys(map: Map<string, number>, limit: number): string[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
