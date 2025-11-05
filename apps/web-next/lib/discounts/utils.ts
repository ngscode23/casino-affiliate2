import type { DiscountWithRelations } from "./types";

export function normalizeCouponCodes(codes: string[] | undefined | null): string[] {
  if (!codes || codes.length === 0) return [];
  const normalized = codes
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    .map((code) => code.trim().toUpperCase());
  return Array.from(new Set(normalized));
}

export function isDiscountCurrentlyActive(discount: DiscountWithRelations, reference: Date): boolean {
  if (!discount.active) return false;
  if (discount.startAt && reference < discount.startAt) return false;
  if (discount.endAt && reference > discount.endAt) return false;
  return true;
}

export function compareDiscountPriority(a: DiscountWithRelations, b: DiscountWithRelations): number {
  const aStart = a.startAt?.getTime() ?? 0;
  const bStart = b.startAt?.getTime() ?? 0;
  if (aStart !== bStart) return aStart - bStart;
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.type !== b.type) {
    return typeWeight(a.type) - typeWeight(b.type);
  }
  return a.id.localeCompare(b.id);
}

function typeWeight(type: DiscountWithRelations["type"]): number {
  switch (type) {
    case "coupon":
      return 1;
    case "percent_off":
      return 2;
    case "amount_off":
      return 3;
    case "bogo":
      return 4;
    case "tiered":
      return 5;
    default:
      return 10;
  }
}

export function cents(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value);
}

export function clampDiscount(amount: number, max: number): number {
  if (amount <= 0) return 0;
  return Math.min(amount, Math.max(max, 0));
}

