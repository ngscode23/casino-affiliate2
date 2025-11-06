import { supabase } from "@shared/lib/supabase";
import { offersNormalized, type NormalizedOffer } from "@shared/lib/offers";
import { HAS_SUPABASE } from "@shared/config";

type PagedResult = { items: NormalizedOffer[]; total: number };

type RemoteRow = {
  slug: string;
  title: string | null;
  rating: number | null;
  attributes: Record<string, unknown> | null;
};

const REMOTE_SELECT = "slug,title,rating,attributes";
const REMOTE_FETCH_LIMIT = 500;

function fallbackPaged(filters: Record<string, any>, limit: number, offset: number): PagedResult {
  const license = filters?.license;
  const query = String(filters?.q ?? "").trim().toLowerCase();
  let items = offersNormalized.map((offer) => ({ ...offer }));
  if (license && license !== "all") {
    items = items.filter((offer) => String(offer.license) === String(license));
  }
  if (query) {
    items = items.filter((offer) => {
      const haystack = [offer.name, offer.license, ...(offer.methods ?? [])].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }
  const sort = String(filters?.sort || "rating");
  const dir = (filters?.dir === "asc" || filters?.dir === "desc" ? filters.dir : "desc") as "asc" | "desc";
  items.sort((a, b) => {
    if (sort === "name") {
      const left = String(a.name || "");
      const right = String(b.name || "");
      return dir === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    }
    if (sort === "payoutHours") {
      const left = Number(a.payoutHours ?? Number.POSITIVE_INFINITY);
      const right = Number(b.payoutHours ?? Number.POSITIVE_INFINITY);
      return dir === "asc" ? left - right : right - left;
    }
    const left = Number(a.rating ?? 0);
    const right = Number(b.rating ?? 0);
    return dir === "asc" ? left - right : right - left;
  });
  const total = items.length;
  const page = items.slice(offset, offset + limit);
  return { items: page, total };
}

function normalizeLicense(raw: unknown): NormalizedOffer["license"] {
  if (typeof raw !== "string") return "Other";
  const trimmed = raw.trim();
  if (!trimmed) return "Other";
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (ascii === "mga") return "MGA";
  if (ascii === "ukgc") return "UKGC";
  if (/^cura(c|k)ao$/.test(ascii)) return "Curaçao";
  return trimmed;
}

function normalizeMethods(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const result: string[] = [];
  for (const value of values) {
    const str = String(value ?? "").trim();
    if (!str) continue;
    if (!result.includes(str)) result.push(str);
  }
  return result;
}

function parsePayoutHours(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function mapRemoteRow(row: RemoteRow): NormalizedOffer {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  return {
    slug: String(row.slug),
    name: row.title ?? row.slug,
    license: normalizeLicense(attrs.compliance_license),
    rating: Number(row.rating ?? 0),
    payout: "",
    payoutHours: parsePayoutHours(attrs.payout_time_hours),
    methods: normalizeMethods(attrs.payout_methods),
    link: undefined,
    enabled: true,
    position: undefined,
  } as NormalizedOffer;
}

export async function getOffersPaged(filters: Record<string, any>, opts: { limit: number; offset: number }): Promise<PagedResult> {
  const { limit, offset } = opts;

  if (!HAS_SUPABASE) {
    return fallbackPaged(filters, limit, offset);
  }

  try {
    let query = supabase
      .from("v_products_flat")
      .select(REMOTE_SELECT, { count: "exact" });

    const search = String(filters?.q ?? "").trim();
    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
    }

    const ratingFilter = filters?.rating as { min?: number; max?: number } | undefined;
    if (ratingFilter && (Number.isFinite(ratingFilter.min as any) || Number.isFinite(ratingFilter.max as any))) {
      if (Number.isFinite(ratingFilter.min as any)) query = query.gte("rating", Number(ratingFilter.min));
      if (Number.isFinite(ratingFilter.max as any)) query = query.lte("rating", Number(ratingFilter.max));
    }

    const sortKey = String(filters?.sort || "rating");
    const direction = (filters?.dir === "asc" || filters?.dir === "desc" ? filters.dir : "desc") as "asc" | "desc";
    const orderColumn = sortKey === "name" ? "title" : "rating";
    query = query.order(orderColumn as any, { ascending: direction === "asc" });
    if (orderColumn !== "title") {
      query = query.order("title", { ascending: true });
    }
    query = query.order("slug", { ascending: true });
    query = query.range(0, REMOTE_FETCH_LIMIT - 1);

    const { data, error } = await query;
    if (error || !data) {
      return fallbackPaged(filters, limit, offset);
    }

    let items = (data as RemoteRow[]).map(mapRemoteRow);

    const licenseFilter = (filters?.compliance_license || filters?.license) as string | string[] | undefined;
    if (Array.isArray(licenseFilter) && licenseFilter.length) {
      const allowed = new Set(licenseFilter.map((value) => String(value)));
      items = items.filter((offer) => allowed.has(String(offer.license)));
    } else if (typeof licenseFilter === "string" && licenseFilter && licenseFilter !== "all") {
      items = items.filter((offer) => String(offer.license) === String(licenseFilter));
    }

    const hoursFilter = filters?.payout_time_hours as { min?: number; max?: number } | undefined;
    if (hoursFilter && (Number.isFinite(hoursFilter.min as any) || Number.isFinite(hoursFilter.max as any))) {
      items = items.filter((offer) => {
        const value = offer.payoutHours;
        if (value == null) return false;
        if (Number.isFinite(hoursFilter.min as any) && value < Number(hoursFilter.min)) return false;
        if (Number.isFinite(hoursFilter.max as any) && value > Number(hoursFilter.max)) return false;
        return true;
      });
    }

    const methodsFilter = Array.isArray(filters?.payout_methods) ? (filters.payout_methods as string[]) : [];
    if (methodsFilter.length) {
      const desired = new Set(methodsFilter.map((value) => String(value)));
      items = items.filter((offer) => (offer.methods ?? []).some((method) => desired.has(String(method))));
    }

    const total = items.length;
    const page = items.slice(offset, offset + limit);
    return { items: page, total };
  } catch {
    return fallbackPaged(filters, limit, offset);
  }
}

export default getOffersPaged;
