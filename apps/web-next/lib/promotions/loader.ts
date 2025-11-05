import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/lib/database.types";
import type {
  Promotion,
  PromotionAction,
  PromotionCondition,
  PromotionCoupon,
  PromotionStatus,
} from "./types";

type PublicClient = SupabaseClient<Database>;

const SELECT_PROMOTIONS =
  "id, slug, name, description, status, priority, combinable, stack_group, starts_at, ends_at, metadata, promotion_actions ( id, promotion_id, kind, config ), promotion_conditions ( id, promotion_id, kind, config ), promotion_coupons ( id, promotion_id, code, starts_at, ends_at, usage_limit_total, usage_limit_per_user, metadata )";

export interface LoadPromotionsOptions {
  includeInactive?: boolean;
  includeScheduled?: boolean;
  includeDrafts?: boolean;
  couponCodes?: string[];
  now?: Date;
}

export async function loadPromotions(client: PublicClient, opts: LoadPromotionsOptions = {}): Promise<Promotion[]> {
  const { includeInactive = false, includeScheduled = true, includeDrafts = false } = opts;
  let query = client
    // избегаем ошибки перегрузки, явно приводя relation к any
    .from("promotions" as any)
    .select(SELECT_PROMOTIONS)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  const statuses: PromotionStatus[] = [];
  if (includeDrafts) statuses.push("draft");
  statuses.push("active");
  if (includeScheduled) statuses.push("scheduled");
  if (includeInactive) statuses.push("expired", "archived");

  if (!includeInactive || !includeDrafts) {
    query = query.in("status", statuses as any);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load promotions: ${error.message}`);
  }

  const now = opts.now ?? new Date();
  const couponSet = normalizeCouponCodes(opts.couponCodes);

  return (data ?? []).map(toPromotion).filter((promo): promo is Promotion => {
    if (!promo) return false;
    const isActive = promo.status === "active";
    const isScheduled = promo.status === "scheduled";
    if (!includeInactive && promo.status === "expired") return false;
    if (!includeInactive && promo.status === "archived") return false;
    if (!includeDrafts && promo.status === "draft") return false;
    if (!includeScheduled && isScheduled) return false;

    const startOk = !promo.startsAt || new Date(promo.startsAt) <= now;
    const endOk = !promo.endsAt || new Date(promo.endsAt) >= now;
    const withinWindow = startOk && endOk;

    if (!withinWindow && isActive) {
      return false;
    }

    if (promo.coupons.length > 0 && couponSet.size > 0) {
      const matchesCoupon = promo.coupons.some((coupon) => couponSet.has(coupon.code.toLowerCase()));
      if (!matchesCoupon) return false;
    } else if (promo.coupons.length > 0 && couponSet.size === 0) {
      return false;
    }

    return true;
  });
}

function toPromotion(row: any): Promotion | null {
  if (!row) return null;
  const metadata = typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {};
  const actions = Array.isArray(row.promotion_actions) ? row.promotion_actions.map(toAction).filter(Boolean) : [];
  const conditions = Array.isArray(row.promotion_conditions)
    ? row.promotion_conditions.map(toCondition).filter(Boolean)
    : [];
  const coupons = Array.isArray(row.promotion_coupons)
    ? row.promotion_coupons.map(toCoupon).filter(Boolean)
    : [];

  return {
    id: String(row.id),
    slug: String(row.slug ?? row.id),
    name: String(row.name ?? ""),
    description: row.description ? String(row.description) : null,
    status: (row.status ?? "draft") as PromotionStatus,
    priority: Number(row.priority ?? 0),
    combinable: Boolean(row.combinable ?? false),
    stackGroup: row.stack_group ? String(row.stack_group) : null,
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    metadata,
    actions: actions as PromotionAction[],
    conditions: conditions as PromotionCondition[],
    coupons: coupons as PromotionCoupon[],
  };
}

function toAction(row: any): PromotionAction | null {
  if (!row) return null;
  const config = normalizeJson(row.config);
  return {
    id: String(row.id),
    promotionId: String(row.promotion_id ?? row.promotionId ?? ""),
    kind: String(row.kind ?? "percentage_discount"),
    config,
  } as PromotionAction;
}

function toCondition(row: any): PromotionCondition | null {
  if (!row) return null;
  return {
    id: String(row.id),
    promotionId: String(row.promotion_id ?? row.promotionId ?? ""),
    kind: String(row.kind ?? "custom"),
    config: normalizeJson(row.config),
  } as PromotionCondition;
}

function toCoupon(row: any): PromotionCoupon | null {
  if (!row) return null;
  return {
    id: String(row.id),
    promotionId: String(row.promotion_id ?? row.promotionId ?? ""),
    code: String(row.code ?? ""),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    usageLimitTotal: row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    usageLimitPerUser: row.usage_limit_per_user == null ? null : Number(row.usage_limit_per_user),
    metadata: normalizeJson(row.metadata) as Record<string, unknown>,
  };
}

function normalizeJson(value: unknown): Record<string, unknown> | Record<string, unknown>[] | unknown {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeCouponCodes(codes?: string[] | null): Set<string> {
  if (!codes) return new Set();
  return new Set(
    codes
      .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
      .map((code) => code.trim().toLowerCase()),
  );
}

