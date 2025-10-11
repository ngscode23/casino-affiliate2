import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AnalyticsSnapshot,
  AnalyticsDayPoint,
  AnalyticsSlugEntry,
  AnalyticsSourceEntry,
  AnalyticsUtmEntry,
  AnalyticsKpi,
  AnalyticsFunnel,
  AnalyticsCompareBlock,
  AnalyticsDiffBlock,
} from "@/app/api/admin/analytics/types";

const DAY_MS = 86_400_000;
const MAX_EVENT_ROWS = 5_000;
const DEFAULT_TOP_LIMIT = 50;
const MAX_TOP_LIMIT = 300;

type CurrencyMap = Record<string, number>;

export interface AnalyticsRange {
  from: Date;
  to: Date;
}

export interface ParsedFilters {
  raw: {
    slugs: string[];
    utmSources: string[];
    utmCampaigns: string[];
    devices: string[];
    langs: string[];
    referrerHosts: string[];
  };
  normalized: {
    slugs: Set<string>;
    utmSources: Set<string>;
    utmCampaigns: Set<string>;
    devices: Set<string>;
    langs: Set<string>;
    referrerHosts: Set<string>;
  };
  limit: number;
  compare: boolean;
}

interface BuildOptions {
  topLimit?: number;
}

interface ClickContext {
  slug: string;
  slugNorm: string;
  day: string | null;
  source: string;
  sourceNorm: string;
  utmCampaign: string;
  utmCampaignNorm: string;
  device: string;
  deviceNorm: string;
  lang: string;
  langNorm: string;
  referrerHost: string;
  referrerHostNorm: string;
}

interface ClickAggregation {
  total: number;
  byDay: Map<string, number>;
  bySlug: Map<string, number>;
  sparkline: Map<string, Map<string, number>>;
  bySource: Map<string, number>;
  utm: Map<string, number>;
  contexts: ClickContext[];
}

interface ImpressionContext {
  slug: string;
  slugNorm: string;
  day: string | null;
  device: string;
  deviceNorm: string;
  lang: string;
  langNorm: string;
}

interface ImpressionAggregation {
  total: number;
  byDay: Map<string, number>;
  bySlug: Map<string, number>;
  byDevice: Map<string, number>;
  byLang: Map<string, number>;
  contexts: ImpressionContext[];
}

interface OrderContext {
  orderId: string;
  paidAt: string;
  currency: string;
  utmSource: string;
  utmSourceNorm: string;
  utmCampaign: string;
  utmCampaignNorm: string;
  device: string;
  deviceNorm: string;
  lang: string;
  langNorm: string;
  referrerHost: string;
  referrerHostNorm: string;
  slugs: Map<string, { slugNorm: string; revenue: number }>;
  revenueByCurrency: CurrencyMap;
  revenueTotal: number;
}

interface ConversionsAggregation {
  topSlugs: Map<
    string,
    {
      paid: number;
      revenue: CurrencyMap;
      revenueTotal: number;
      avgOrderValue: number | null;
    }
  >;
  topSources: Map<
    string,
    {
      source: string;
      paid: number;
      revenue: CurrencyMap;
      revenueTotal: number;
      avgOrderValue: number | null;
      campaigns: Map<string, number>;
    }
  >;
  totalPaidOrders: number;
  revenueByCurrency: CurrencyMap;
  fallbackUsed: boolean;
}

export interface SnapshotInternals {
  clicks: ClickAggregation;
  impressions: ImpressionAggregation;
  conversions: ConversionsAggregation;
  payments: {
    attempts: number;
    paidOrdersSet: Set<string>;
  };
  refundsByCurrency: CurrencyMap;
  topSlugsFull: AnalyticsSlugEntry[];
  topSourcesFull: AnalyticsSourceEntry[];
}

const PAID_STATUSES = new Set(["paid", "succeeded", "captured"]);
const ORDER_PAID_STATUSES = ["paid", "refunded"] as const;

function normalizeString(value: unknown, fallback = "-"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeDevice(value: unknown): string {
  const result = normalizeString(value, "unknown");
  return result.toLowerCase();
}

function normalizeLang(value: unknown): string {
  const result = normalizeString(value, "-");
  return result.toLowerCase();
}

function normalizeSlug(value: unknown): string {
  const slug = normalizeString(value, "-");
  return slug || "-";
}

function normalizeHost(value: unknown): string {
  const host = normalizeString(value, "-");
  return host.replace(/^https?:\/\//i, "");
}

function matchFilter(set: Set<string>, value: string): boolean {
  if (!set.size) return true;
  return set.has(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function safeDay(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function mergeCurrencyMaps(target: CurrencyMap, addition: CurrencyMap | null | undefined) {
  if (!addition) return;
  for (const [currencyRaw, amountRaw] of Object.entries(addition)) {
    const currency = normalizeString(currencyRaw, "EUR").toUpperCase();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) continue;
    target[currency] = (target[currency] ?? 0) + amount;
  }
}

function subtractCurrencyMaps(base: CurrencyMap, deduction: CurrencyMap): CurrencyMap {
  const result: CurrencyMap = { ...base };
  for (const [currency, amount] of Object.entries(deduction)) {
    result[currency] = (result[currency] ?? 0) - amount;
    if (Math.abs(result[currency]) < 1e-9) delete result[currency];
  }
  return result;
}

export function parseRange(search: URLSearchParams): AnalyticsRange {
  const rangeRaw = (search.get("range") ?? "30").toLowerCase();
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  if (rangeRaw === "custom") {
    const fromParam = search.get("from");
    const toParam = search.get("to");
    if (fromParam && toParam) {
      const fromDate = new Date(fromParam);
      const toDate = new Date(toParam);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0, 0, 0));
        const to = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999));
        if (from <= to) {
          return { from, to };
        }
      }
    }
  }

  const days = Number.parseInt(rangeRaw, 10);
  const validDays = Number.isFinite(days) && days > 0 ? Math.min(days, 180) : 30;
  const from = new Date(todayUtc.getTime() - validDays * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to: todayUtc };
}

function parseList(search: URLSearchParams, key: string): string[] {
  const raw = [...search.getAll(key), ...search.getAll(`${key}[]`)];
  return raw
    .flatMap((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .slice(0, 200);
}

export function parseFilters(search: URLSearchParams): ParsedFilters {
  const limitRaw = Number.parseInt(search.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_TOP_LIMIT)
    : DEFAULT_TOP_LIMIT;

  const slugs = parseList(search, "slug");
  const utmSources = parseList(search, "utm_source");
  const utmCampaigns = parseList(search, "utm_campaign");
  const devices = parseList(search, "device");
  const langs = parseList(search, "lang");
  const referrerHosts = parseList(search, "referrer_host");

  return {
    raw: {
      slugs,
      utmSources,
      utmCampaigns,
      devices,
      langs,
      referrerHosts,
    },
    normalized: {
      slugs: new Set(slugs.map((value) => value.toLowerCase())),
      utmSources: new Set(utmSources.map((value) => value.toLowerCase())),
      utmCampaigns: new Set(utmCampaigns.map((value) => value.toLowerCase())),
      devices: new Set(devices.map((value) => value.toLowerCase())),
      langs: new Set(langs.map((value) => value.toLowerCase())),
      referrerHosts: new Set(referrerHosts.map((value) => value.toLowerCase())),
    },
    limit,
    compare: search.get("compare") === "1",
  };
}

async function fetchPaidOrdersContext(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  filters: ParsedFilters,
): Promise<Map<string, OrderContext>> {
  let query = supabase
    .from("orders")
    .select("id, paid_at, status, currency, checkout_metadata")
    .gte("paid_at", range.from.toISOString())
    .lte("paid_at", range.to.toISOString());

  const orderStatuses = ORDER_PAID_STATUSES.slice();
  if (orderStatuses.length === 1) {
    query = query.eq("status", orderStatuses[0]);
  } else if (orderStatuses.length > 1) {
    query = query.in("status", orderStatuses);
  }

  const { data: ordersData, error: ordersError } = await query;

  if (ordersError) {
    throw new Error(`orders query failed: ${ordersError.message}`);
  }

  const orders = new Map<string, OrderContext>();

  for (const row of ordersData ?? []) {
    const paidAt = typeof (row as any).paid_at === "string" ? (row as any).paid_at : null;
    const status = normalizeString((row as any).status, "pending").toLowerCase();
    if (!paidAt || !PAID_STATUSES.has(status)) continue;

    const metadata = parseJsonRecord((row as any).checkout_metadata);
    const utm = parseJsonRecord(metadata.utm);

    const utmSource = normalizeString(utm.utm_source ?? metadata.utm_source, "-");
    const utmSourceNorm = utmSource.toLowerCase();
    const utmCampaign = normalizeString(utm.utm_campaign ?? metadata.utm_campaign, "-");
    const utmCampaignNorm = utmCampaign.toLowerCase();
    const device = normalizeDevice(utm.device ?? metadata.device);
    const deviceNorm = device.toLowerCase();
    const lang = normalizeString(utm.lang ?? metadata.lang, "-");
    const langNorm = lang.toLowerCase();
    const referrerHost = normalizeHost(utm.referrer_host ?? metadata.referrer_host ?? metadata.referrer);
    const referrerHostNorm = referrerHost.toLowerCase();

    const matches =
      matchFilter(filters.normalized.utmSources, utmSourceNorm) &&
      matchFilter(filters.normalized.utmCampaigns, utmCampaignNorm) &&
      matchFilter(filters.normalized.devices, deviceNorm) &&
      matchFilter(filters.normalized.langs, langNorm) &&
      matchFilter(filters.normalized.referrerHosts, referrerHostNorm);

    if (!matches) continue;

    const currency = normalizeString((row as any).currency, "EUR").toUpperCase();

    orders.set((row as any).id, {
      orderId: (row as any).id,
      paidAt,
      currency,
      utmSource,
      utmSourceNorm,
      utmCampaign,
      utmCampaignNorm,
      device,
      deviceNorm,
      lang,
      langNorm,
      referrerHost,
      referrerHostNorm,
      slugs: new Map(),
      revenueByCurrency: {},
      revenueTotal: 0,
    });
  }

  if (!orders.size) return orders;

  const orderIds = Array.from(orders.keys());
  const chunkSize = 200;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, total, qty, unit_price, ecom_products!inner(slug)")
      .in("order_id", chunk);

    if (itemsError) {
      throw new Error(`order_items query failed: ${itemsError.message}`);
    }

    for (const row of itemsData ?? []) {
      const orderId = (row as any).order_id;
      const context = orders.get(orderId);
      if (!context) continue;

      const product = parseJsonRecord((row as any).ecom_products);
      const slug = normalizeSlug(product.slug);
      const slugNorm = slug.toLowerCase();

      if (!matchFilter(filters.normalized.slugs, slugNorm)) continue;

      const totalRaw = Number((row as any).total);
      const qty = Number((row as any).qty ?? 0);
      const unit = Number((row as any).unit_price ?? 0);
      const amount = Number.isFinite(totalRaw) ? totalRaw : qty * unit;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      context.slugs.set(slug, {
        slugNorm,
        revenue: (context.slugs.get(slug)?.revenue ?? 0) + amount,
      });
      context.revenueTotal += amount;
      context.revenueByCurrency[context.currency] =
        (context.revenueByCurrency[context.currency] ?? 0) + amount;
    }
  }

  for (const [orderId, context] of orders.entries()) {
    if (!context.slugs.size) {
      orders.delete(orderId);
    }
  }

  return orders;
}

function aggregateConversionsFromOrders(
  orders: Map<string, OrderContext>,
): ConversionsAggregation {
  const slugMap = new Map<
    string,
    {
      paid: number;
      revenue: CurrencyMap;
      revenueTotal: number;
      avgOrderValue: number | null;
    }
  >();

  const sourceMap = new Map<
    string,
    {
      source: string;
      paid: number;
      revenue: CurrencyMap;
      revenueTotal: number;
      avgOrderValue: number | null;
      campaigns: Map<string, number>;
    }
  >();

  let totalPaidOrders = 0;
  const revenueByCurrency: CurrencyMap = {};

  for (const context of orders.values()) {
    if (!context.slugs.size) continue;

    totalPaidOrders += 1;
    mergeCurrencyMaps(revenueByCurrency, context.revenueByCurrency);

    for (const [slug, info] of context.slugs.entries()) {
      const existing = slugMap.get(slug) ?? {
        paid: 0,
        revenue: {},
        revenueTotal: 0,
        avgOrderValue: null,
      };
      existing.paid += 1;
      existing.revenueTotal += info.revenue;
      existing.revenue[context.currency] =
        (existing.revenue[context.currency] ?? 0) + info.revenue;
      slugMap.set(slug, existing);
    }

    const sourceKey = context.utmSource !== "-" ? context.utmSource : context.referrerHost || "-";
    const sourceEntry = sourceMap.get(sourceKey) ?? {
      source: sourceKey,
      paid: 0,
      revenue: {},
      revenueTotal: 0,
      avgOrderValue: null,
      campaigns: new Map<string, number>(),
    };
    sourceEntry.paid += 1;
    sourceEntry.revenueTotal += context.revenueTotal;
    sourceEntry.revenue[context.currency] =
      (sourceEntry.revenue[context.currency] ?? 0) + context.revenueTotal;
    sourceEntry.campaigns.set(
      context.utmCampaign,
      (sourceEntry.campaigns.get(context.utmCampaign) ?? 0) + 1,
    );
    sourceMap.set(sourceKey, sourceEntry);
  }

  for (const entry of slugMap.values()) {
    entry.avgOrderValue = entry.paid > 0 ? entry.revenueTotal / entry.paid : null;
  }
  for (const entry of sourceMap.values()) {
    entry.avgOrderValue = entry.paid > 0 ? entry.revenueTotal / entry.paid : null;
  }

  return {
    topSlugs: slugMap,
    topSources: sourceMap,
    totalPaidOrders,
    revenueByCurrency,
    fallbackUsed: true,
  };
}

function applyMvOverrideToSlugs(
  target: Map<string, { paid: number; revenue: CurrencyMap; revenueTotal: number; avgOrderValue: number | null }>,
  rows: any[] | null | undefined,
  filters: ParsedFilters,
) {
  if (!rows?.length) return;
  for (const row of rows) {
    const slug = normalizeSlug((row as any).slug);
    const slugNorm = slug.toLowerCase();
    if (!matchFilter(filters.normalized.slugs, slugNorm)) continue;

    const paid = Number((row as any).paid_orders ?? 0);
    if (!Number.isFinite(paid)) continue;

    const revenueByCurrency: CurrencyMap = {};
    mergeCurrencyMaps(revenueByCurrency, (row as any).revenue_by_currency as CurrencyMap);
    const revenueTotal = Number((row as any).revenue_total ?? 0);

    const entry = target.get(slug) ?? {
      paid: 0,
      revenue: {},
      revenueTotal: 0,
      avgOrderValue: null,
    };
    entry.paid += paid;
    entry.revenueTotal += Number.isFinite(revenueTotal) ? revenueTotal : 0;
    mergeCurrencyMaps(entry.revenue, revenueByCurrency);
    entry.avgOrderValue = entry.paid > 0 ? entry.revenueTotal / entry.paid : null;
    target.set(slug, entry);
  }
}

function applyMvOverrideToSources(
  target: Map<
    string,
    {
      source: string;
      paid: number;
      revenue: CurrencyMap;
      revenueTotal: number;
      avgOrderValue: number | null;
      campaigns: Map<string, number>;
    }
  >,
  rows: any[] | null | undefined,
  filters: ParsedFilters,
) {
  if (!rows?.length) return;
  for (const row of rows) {
    const source = normalizeString((row as any).source, "-");
    const sourceNorm = source.toLowerCase();
    if (!matchFilter(filters.normalized.utmSources, sourceNorm)) continue;

    const slug = normalizeSlug((row as any).slug);
    const slugNorm = slug.toLowerCase();
    if (!matchFilter(filters.normalized.slugs, slugNorm)) continue;

    const campaign = normalizeString((row as any).utm_campaign, "-");
    const campaignNorm = campaign.toLowerCase();
    if (!matchFilter(filters.normalized.utmCampaigns, campaignNorm)) continue;

    const device = normalizeDevice((row as any).device);
    if (!matchFilter(filters.normalized.devices, device.toLowerCase())) continue;

    const lang = normalizeString((row as any).lang, "-");
    if (!matchFilter(filters.normalized.langs, lang.toLowerCase())) continue;

    const referrerHost = normalizeHost((row as any).referrer_host);
    if (!matchFilter(filters.normalized.referrerHosts, referrerHost.toLowerCase())) continue;

    const paid = Number((row as any).paid_orders ?? 0);
    if (!Number.isFinite(paid)) continue;

    const revenueByCurrency: CurrencyMap = {};
    mergeCurrencyMaps(revenueByCurrency, (row as any).revenue_by_currency as CurrencyMap);
    const revenueTotal = Number((row as any).revenue_total ?? 0);

    const entry = target.get(source) ?? {
      source,
      paid: 0,
      revenue: {},
      revenueTotal: 0,
      avgOrderValue: null,
      campaigns: new Map<string, number>(),
    };
    entry.paid += paid;
    entry.revenueTotal += Number.isFinite(revenueTotal) ? revenueTotal : 0;
    mergeCurrencyMaps(entry.revenue, revenueByCurrency);
    entry.campaigns.set(campaign, (entry.campaigns.get(campaign) ?? 0) + paid);
    entry.avgOrderValue = entry.paid > 0 ? entry.revenueTotal / entry.paid : null;
    target.set(source, entry);
  }
}

async function fetchConversions(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  filters: ParsedFilters,
): Promise<{ aggregation: ConversionsAggregation; ordersContext: Map<string, OrderContext> }> {
  const ordersContext = await fetchPaidOrdersContext(supabase, range, filters);
  const aggregation = aggregateConversionsFromOrders(ordersContext);

  const fromDate = range.from.toISOString().slice(0, 10);
  const toDate = range.to.toISOString().slice(0, 10);

  try {
    let slugQuery = supabase
      .from("conversions_by_slug_day_mv")
      .select(
        "date, slug, utm_source, utm_campaign, device, lang, referrer_host, paid_orders, revenue_by_currency, revenue_total",
      )
      .gte("date", fromDate)
      .lte("date", toDate);

    if (filters.raw.slugs.length) slugQuery = slugQuery.in("slug", filters.raw.slugs);
    if (filters.raw.utmSources.length) slugQuery = slugQuery.in("utm_source", filters.raw.utmSources);
    if (filters.raw.utmCampaigns.length) slugQuery = slugQuery.in("utm_campaign", filters.raw.utmCampaigns);
    if (filters.raw.devices.length) slugQuery = slugQuery.in("device", filters.raw.devices);
    if (filters.raw.langs.length) slugQuery = slugQuery.in("lang", filters.raw.langs);
    if (filters.raw.referrerHosts.length) slugQuery = slugQuery.in("referrer_host", filters.raw.referrerHosts);

    const { data: slugData, error: slugError } = await slugQuery;
    if (slugError) throw slugError;

    applyMvOverrideToSlugs(aggregation.topSlugs, slugData ?? [], filters);

    let sourceQuery = supabase
      .from("conversions_by_source_day_mv")
      .select(
        "date, source, utm_campaign, slug, device, lang, referrer_host, paid_orders, revenue_by_currency, revenue_total",
      )
      .gte("date", fromDate)
      .lte("date", toDate);

    if (filters.raw.utmSources.length) sourceQuery = sourceQuery.in("source", filters.raw.utmSources);
    if (filters.raw.utmCampaigns.length) sourceQuery = sourceQuery.in("utm_campaign", filters.raw.utmCampaigns);
    if (filters.raw.slugs.length) sourceQuery = sourceQuery.in("slug", filters.raw.slugs);
    if (filters.raw.devices.length) sourceQuery = sourceQuery.in("device", filters.raw.devices);
    if (filters.raw.langs.length) sourceQuery = sourceQuery.in("lang", filters.raw.langs);
    if (filters.raw.referrerHosts.length) sourceQuery = sourceQuery.in("referrer_host", filters.raw.referrerHosts);

    const { data: sourceData, error: sourceError } = await sourceQuery;
    if (sourceError) throw sourceError;

    applyMvOverrideToSources(aggregation.topSources, sourceData ?? [], filters);
    aggregation.fallbackUsed = false;
  } catch {
    // keep fallback data
  }

  return { aggregation, ordersContext };
}

async function fetchPayments(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  ordersContext: Map<string, OrderContext>,
): Promise<{ attempts: number; refunds: CurrencyMap }> {
  const paymentIds = new Set<string>();
  const { data: paymentsData } = await supabase
    .from("payments")
    .select("id, status, amount, currency, created_at, order_id")
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  let attempts = 0;
  if (paymentsData) {
    for (const row of paymentsData) {
      const orderId = (row as any).order_id;
      if (orderId && !ordersContext.has(orderId)) continue;
      const paymentId = (row as any).id;
      if (!paymentIds.has(paymentId)) {
        paymentIds.add(paymentId);
        attempts += 1;
      }
    }
  }

  const refundsByCurrency: CurrencyMap = {};
  try {
    const { data: refundsData, error: refundsError } = await supabase
      .from("payment_refunds")
      .select("amount_cents, currency, created_at, order_id")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString());
    if (refundsError) throw refundsError;
    for (const row of refundsData ?? []) {
      const orderId = (row as any).order_id;
      if (orderId && !ordersContext.has(orderId)) continue;
      const currency = normalizeString((row as any).currency, "EUR").toUpperCase();
      const amount = Number((row as any).amount_cents ?? 0) / 100;
      if (!Number.isFinite(amount)) continue;
      refundsByCurrency[currency] = (refundsByCurrency[currency] ?? 0) + amount;
    }
  } catch {
    // ignore refund failures
  }

  return { attempts, refunds: refundsByCurrency };
}

function buildSparklineObject(
  sparkMap: Map<string, Map<string, number>>,
  topSlugs: AnalyticsSlugEntry[],
): Record<string, AnalyticsDayPoint[]> {
  const result: Record<string, AnalyticsDayPoint[]> = {};
  for (const entry of topSlugs.slice(0, 10)) {
    const points = sparkMap.get(entry.slug);
    if (!points) continue;
    result[entry.slug] = Array.from(points.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return result;
}

function buildUtmReport(utmMap: Map<string, number>): AnalyticsUtmEntry[] {
  return Array.from(utmMap.entries())
    .map(([key, count]) => {
      const [source, campaign] = key.split("|");
      return { source, campaign, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 200);
}

function mapToArray(map: Map<string, number>, kind: "device" | "lang"): Array<{ device?: string; lang?: string; count: number }> {
  return Array.from(map.entries())
    .map(([key, count]) =>
      kind === "device" ? { device: key, count } : { lang: key, count },
    )
    .sort((a, b) => b.count - a.count);
}

function buildSlugEntriesFromData(
  clicks: ClickAggregation,
  impressions: ImpressionAggregation,
  conversions: ConversionsAggregation,
  limit?: number,
): AnalyticsSlugEntry[] {
  const slugSet = new Set<string>([...clicks.bySlug.keys(), ...conversions.topSlugs.keys()]);
  const entries = Array.from(slugSet).map((slug) => {
    const clicksCount = clicks.bySlug.get(slug) ?? 0;
    const impressionsCount = impressions.bySlug.get(slug) ?? 0;
    const conversion = conversions.topSlugs.get(slug);
    const paid = conversion?.paid ?? 0;
    const revenueTotal = conversion?.revenueTotal ?? 0;
    const revenue = { ...(conversion?.revenue ?? {}) };
    const avgOrderValue = conversion?.avgOrderValue ?? (paid > 0 ? revenueTotal / paid : null);
    return {
      slug,
      clicks: clicksCount,
      impressions: impressionsCount,
      ctr: impressionsCount > 0 ? clicksCount / impressionsCount : 0,
      paid,
      cr: clicksCount > 0 ? paid / clicksCount : 0,
      revenue,
      revenueTotal,
      avgOrderValue,
    };
  });

  entries.sort((a, b) => {
    const clickDiff = (b.clicks ?? 0) - (a.clicks ?? 0);
    if (clickDiff !== 0) return clickDiff;
    return (b.paid ?? 0) - (a.paid ?? 0);
  });

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

function buildSourceEntriesFromData(
  clicks: ClickAggregation,
  conversions: ConversionsAggregation,
  limit?: number,
): AnalyticsSourceEntry[] {
  const sourceSet = new Set<string>([...clicks.bySource.keys(), ...conversions.topSources.keys()]);
  const entries = Array.from(sourceSet).map((source) => {
    const clicksCount = clicks.bySource.get(source) ?? 0;
    const conversion = conversions.topSources.get(source);
    const paid = conversion?.paid ?? 0;
    const revenueTotal = conversion?.revenueTotal ?? 0;
    const revenue = { ...(conversion?.revenue ?? {}) };
    const avgOrderValue = conversion?.avgOrderValue ?? (paid > 0 ? revenueTotal / paid : null);
    return {
      source,
      count: clicksCount,
      paid,
      cr: clicksCount > 0 ? paid / clicksCount : 0,
      revenue,
      revenueTotal,
      avgOrderValue,
    };
  });

  entries.sort((a, b) => {
    const clickDiff = (b.count ?? 0) - (a.count ?? 0);
    if (clickDiff !== 0) return clickDiff;
    return (b.paid ?? 0) - (a.paid ?? 0);
  });

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

function aggregateRevenueFromSlugs(slugs: AnalyticsSlugEntry[]): CurrencyMap {
  const result: CurrencyMap = {};
  for (const entry of slugs) {
    mergeCurrencyMaps(result, entry.revenue ?? {});
  }
  return result;
}

function computeOverallCr(clicks: number, paid: number): number {
  if (!clicks) return 0;
  return paid / clicks;
}

export async function buildAnalyticsSnapshot(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  filters: ParsedFilters,
  options: BuildOptions = {},
): Promise<{ snapshot: AnalyticsSnapshot; internals: SnapshotInternals }> {
  const topLimit = Math.min(Math.max(options.topLimit ?? filters.limit, 1), MAX_TOP_LIMIT);

  const clicks = await fetchClicks(supabase, range, filters);
  const impressions = await fetchImpressions(supabase, range, filters);
  const { aggregation: conversions, ordersContext } = await fetchConversions(supabase, range, filters);

  const slugEntries = buildSlugEntriesFromData(clicks, impressions, conversions, topLimit);
  const sourceEntries = buildSourceEntriesFromData(clicks, conversions, topLimit);

  const sparkline = buildSparklineObject(clicks.sparkline, slugEntries);
  const utmReport = buildUtmReport(clicks.utm);
  const devices = mapToArray(impressions.byDevice, "device").map((entry) => ({
    device: entry.device ?? "unknown",
    count: entry.count,
  }));
  const languages = mapToArray(impressions.byLang, "lang").map((entry) => ({
    lang: entry.lang ?? "-",
    count: entry.count,
  }));

  const revenueByCurrency = aggregateRevenueFromSlugs(slugEntries);

  const paymentStats = await fetchPayments(supabase, range, ordersContext);
  const netByCurrency = subtractCurrencyMaps(revenueByCurrency, paymentStats.refunds);

  const clicksTotal = clicks.total;
  const impressionsTotal = impressions.total;
  const paidTotal = slugEntries.reduce((acc, entry) => acc + (entry.paid ?? 0), 0);

  const kpi: AnalyticsKpi = {
    revenueByCurrency,
    refundsByCurrency: paymentStats.refunds,
    netByCurrency,
  };

  const funnel: AnalyticsFunnel = {
    impressions: impressionsTotal,
    clicks: clicksTotal,
    payment_attempts: paymentStats.attempts,
    paid: paidTotal,
  };

  const snapshot: AnalyticsSnapshot = {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    totals: {
      clicks: clicksTotal,
      impressions: impressionsTotal,
    },
    byDay: {
      clicks: Array.from(clicks.byDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      impressions: Array.from(impressions.byDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
    topSlugs: slugEntries,
    sparkline,
    topSources: sourceEntries,
    utm: utmReport,
    devices,
    languages,
    kpi,
    funnel,
    meta: {
      limit: topLimit,
      generatedAt: new Date().toISOString(),
      filters: {
        slug: filters.raw.slugs,
        utm_source: filters.raw.utmSources,
        utm_campaign: filters.raw.utmCampaigns,
        device: filters.raw.devices,
        lang: filters.raw.langs,
        referrer_host: filters.raw.referrerHosts,
      },
      fallback: {
        conversions: conversions.fallbackUsed,
      },
    },
  };

  const allSlugs = buildSlugEntriesFromData(clicks, impressions, conversions);
  const allSources = buildSourceEntriesFromData(clicks, conversions);

  return {
    snapshot,
    internals: {
      clicks,
      impressions,
      conversions,
      payments: {
        attempts: paymentStats.attempts,
        paidOrdersSet: new Set(ordersContext.keys()),
      },
      refundsByCurrency: paymentStats.refunds,
      topSlugsFull: allSlugs,
      topSourcesFull: allSources,
    },
  };
}

export function buildCompareBlock(current: AnalyticsSnapshot, previous: AnalyticsSnapshot): AnalyticsCompareBlock {
  const revenueCurrent = current.kpi?.revenueByCurrency ?? {};
  const revenuePrev = previous.kpi?.revenueByCurrency ?? {};

  const revenueDiffAbs: CurrencyMap = { ...revenueCurrent };
  for (const [currency, amount] of Object.entries(revenuePrev)) {
    revenueDiffAbs[currency] = (revenueDiffAbs[currency] ?? 0) - amount;
  }

  const revenueDiffPct: CurrencyMap = {};
  for (const [currency, amount] of Object.entries(revenueCurrent)) {
    const prevAmount = revenuePrev[currency] ?? 0;
    if (Math.abs(prevAmount) < 1e-9) {
      revenueDiffPct[currency] = amount > 0 ? 1 : 0;
    } else {
      revenueDiffPct[currency] = (amount - prevAmount) / prevAmount;
    }
  }

  const currentPaid = current.funnel?.paid ?? 0;
  const previousPaid = previous.funnel?.paid ?? 0;
  const currentClicks = current.totals.clicks ?? 0;
  const previousClicks = previous.totals.clicks ?? 0;

  const currentRevenueTotal = Object.values(revenueCurrent).reduce((acc, value) => acc + value, 0);
  const previousRevenueTotal = Object.values(revenuePrev).reduce((acc, value) => acc + value, 0);

  const currentAov = currentPaid > 0 ? currentRevenueTotal / currentPaid : 0;
  const previousAov = previousPaid > 0 ? previousRevenueTotal / previousPaid : 0;

  const diffAbs: AnalyticsDiffBlock = {
    clicks: current.totals.clicks - (previous.totals.clicks ?? 0),
    impressions: current.totals.impressions - (previous.totals.impressions ?? 0),
    paid: currentPaid - previousPaid,
    revenue: revenueDiffAbs,
    cr: computeOverallCr(currentClicks, currentPaid) - computeOverallCr(previousClicks, previousPaid),
    aov: currentAov - previousAov,
  };

  const diffPct: AnalyticsDiffBlock = {
    clicks:
      Math.abs(previous.totals.clicks ?? 0) < 1e-9
        ? current.totals.clicks > 0
          ? 1
          : 0
        : (current.totals.clicks - (previous.totals.clicks ?? 0)) / (previous.totals.clicks ?? 1),
    impressions:
      Math.abs(previous.totals.impressions ?? 0) < 1e-9
        ? current.totals.impressions > 0
          ? 1
          : 0
        : (current.totals.impressions - (previous.totals.impressions ?? 0)) / (previous.totals.impressions ?? 1),
    paid:
      Math.abs(previousPaid) < 1e-9 ? (currentPaid > 0 ? 1 : 0) : (currentPaid - previousPaid) / previousPaid,
    revenue: revenueDiffPct,
    cr:
      Math.abs(computeOverallCr(previousClicks, previousPaid)) < 1e-9
        ? computeOverallCr(currentClicks, currentPaid) > 0
          ? 1
          : 0
        : (computeOverallCr(currentClicks, currentPaid) - computeOverallCr(previousClicks, previousPaid)) /
          computeOverallCr(previousClicks, previousPaid),
    aov:
      Math.abs(previousAov) < 1e-9
        ? currentAov > 0
          ? 1
          : 0
        : (currentAov - previousAov) / previousAov,
  };

  return {
    rangePrev: previous.range,
    kpiPrev: previous.kpi ?? {
      revenueByCurrency: {},
      refundsByCurrency: {},
      netByCurrency: {},
    },
    funnelPrev: previous.funnel ?? {
      impressions: previous.totals.impressions ?? 0,
      clicks: previous.totals.clicks ?? 0,
      payment_attempts: 0,
      paid: previousPaid,
    },
    diffAbs,
    diffPct,
  };
}

async function fetchImpressions(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  filters: ParsedFilters,
): Promise<ImpressionAggregation> {
  let query = supabase
    .from("impressions")
    .select("ts, slug, device, lang")
    .gte("ts", range.from.toISOString())
    .lte("ts", range.to.toISOString())
    .order("ts", { ascending: false })
    .limit(MAX_EVENT_ROWS);

  if (filters.raw.slugs.length) {
    query = query.in("slug", filters.raw.slugs);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`impressions query failed: ${error.message}`);
  }

  const byDay = new Map<string, number>();
  const bySlug = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byLang = new Map<string, number>();
  const contexts: ImpressionContext[] = [];

  for (const row of data ?? []) {
    const slug = normalizeSlug((row as any).slug);
    const slugNorm = slug.toLowerCase();
    const day = safeDay((row as any).ts);
    const device = normalizeDevice((row as any).device);
    const deviceNorm = device.toLowerCase();
    const lang = normalizeString((row as any).lang, "-");
    const langNorm = lang.toLowerCase();

    const matches =
      matchFilter(filters.normalized.slugs, slugNorm) &&
      matchFilter(filters.normalized.devices, deviceNorm) &&
      matchFilter(filters.normalized.langs, langNorm);

    if (!matches) continue;

    if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    byLang.set(lang, (byLang.get(lang) ?? 0) + 1);

    contexts.push({
      slug,
      slugNorm,
      day,
      device,
      deviceNorm,
      lang,
      langNorm,
    });
  }

  return {
    total: contexts.length,
    byDay,
    bySlug,
    byDevice,
    byLang,
    contexts,
  };
}

async function fetchClicks(
  supabase: SupabaseClient,
  range: AnalyticsRange,
  filters: ParsedFilters,
): Promise<ClickAggregation> {
  let query = supabase
    .from("clicks")
    .select("ts, slug, referrer, params")
    .gte("ts", range.from.toISOString())
    .lte("ts", range.to.toISOString())
    .order("ts", { ascending: false })
    .limit(MAX_EVENT_ROWS);

  if (filters.raw.slugs.length) {
    query = query.in("slug", filters.raw.slugs);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`clicks query failed: ${error.message}`);
  }

  const byDay = new Map<string, number>();
  const bySlug = new Map<string, number>();
  const sparkline = new Map<string, Map<string, number>>();
  const bySource = new Map<string, number>();
  const utm = new Map<string, number>();
  const contexts: ClickContext[] = [];

  for (const row of data ?? []) {
    const params = parseJsonRecord((row as any).params);
    const slug = normalizeSlug((row as any).slug);
    const slugNorm = slug.toLowerCase();
    const day = safeDay((row as any).ts) ?? null;
    const source = normalizeString(params.utm_source ?? (row as any).referrer, "-");
    const sourceNorm = source.toLowerCase();
    const utmCampaign = normalizeString(params.utm_campaign, "-");
    const utmCampaignNorm = utmCampaign.toLowerCase();
    const device = normalizeDevice(params.device);
    const deviceNorm = device.toLowerCase();
    const lang = normalizeString(params.lang, "-");
    const langNorm = lang.toLowerCase();
    const referrerHost = normalizeHost(params.referrer_host ?? (row as any).referrer ?? "-");
    const referrerHostNorm = referrerHost.toLowerCase();

    const context: ClickContext = {
      slug,
      slugNorm,
      day,
      source,
      sourceNorm,
      utmCampaign,
      utmCampaignNorm,
      device,
      deviceNorm,
      lang,
      langNorm,
      referrerHost,
      referrerHostNorm,
    };

    const matches =
      matchFilter(filters.normalized.slugs, slugNorm) &&
      matchFilter(filters.normalized.utmSources, sourceNorm) &&
      matchFilter(filters.normalized.utmCampaigns, utmCampaignNorm) &&
      matchFilter(filters.normalized.devices, deviceNorm) &&
      matchFilter(filters.normalized.langs, langNorm) &&
      matchFilter(filters.normalized.referrerHosts, referrerHostNorm);

    if (!matches) continue;

    contexts.push(context);

    if (day) {
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    if (!sparkline.has(slug)) sparkline.set(slug, new Map());
    const sparkMap = sparkline.get(slug)!;
    if (day) sparkMap.set(day, (sparkMap.get(day) ?? 0) + 1);

    bySource.set(source, (bySource.get(source) ?? 0) + 1);
    const utmKey = `${source}|${utmCampaign}`;
    utm.set(utmKey, (utm.get(utmKey) ?? 0) + 1);
  }

  const total = contexts.length;

  return {
    total,
    byDay,
    bySlug,
    sparkline,
    bySource,
    utm,
    contexts,
  };
}
