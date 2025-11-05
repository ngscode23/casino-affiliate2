type NullableNumber = number | null;

function coerceNumber(value: unknown): NullableNumber {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function pickNumeric(
  row: Record<string, unknown> | null | undefined,
  keys: string[],
): NullableNumber {
  if (!row) return null;
  for (const key of keys) {
    if (!(key in row)) continue;
    const numeric = coerceNumber((row as Record<string, unknown>)[key]);
    if (numeric != null) {
      return numeric;
    }
  }
  return null;
}

function pickMoneyCents(
  row: Record<string, unknown> | null | undefined,
  centKeys: string[],
  unitKeys: string[],
): NullableNumber {
  const cents = pickNumeric(row, centKeys);
  if (cents != null) {
    return Math.round(cents);
  }
  const units = pickNumeric(row, unitKeys);
  if (units != null) {
    return Math.round(units * 100);
  }
  return null;
}

function normalizePercent(value: NullableNumber): NullableNumber {
  if (value == null || !Number.isFinite(value)) return null;
  const raw = Number(value);
  if (raw <= 0) return null;
  if (raw > 1 && raw <= 100) {
    return Number(raw.toFixed(2));
  }
  if (raw <= 1) {
    return Number((raw * 100).toFixed(2));
  }
  return Number(raw.toFixed(2));
}

function resolvePercentFromPrices(
  priceCents: NullableNumber,
  originalCents: NullableNumber,
): NullableNumber {
  if (
    priceCents == null ||
    originalCents == null ||
    !Number.isFinite(priceCents) ||
    !Number.isFinite(originalCents) ||
    originalCents <= 0
  ) {
    return null;
  }
  if (originalCents <= priceCents) return null;
  return Number((((originalCents - priceCents) / originalCents) * 100).toFixed(2));
}

function resolveDiscountAmount(
  priceCents: NullableNumber,
  originalCents: NullableNumber,
): NullableNumber {
  if (
    priceCents == null ||
    originalCents == null ||
    !Number.isFinite(priceCents) ||
    !Number.isFinite(originalCents)
  ) {
    return null;
  }
  const diff = Math.max(0, Math.round(originalCents - priceCents));
  return diff > 0 ? diff : null;
}

export type PriceDetails = {
  price: number;
  priceCents: number;
  originalPrice: NullableNumber;
  originalPriceCents: NullableNumber;
  discountPercent: NullableNumber;
  discountAmountCents: NullableNumber;
  basePriceCents: NullableNumber;
  hasDiscount: boolean;
};

export function resolvePriceDetails(
  row: Record<string, unknown> | null | undefined,
): PriceDetails {
  const basePriceCents =
    pickMoneyCents(
      row,
      ["base_price_cents", "basePriceCents", "list_price_cents", "listPriceCents"],
      ["base_price", "basePrice", "list_price", "listPrice"],
    ) ?? null;

  const priceCents =
    pickMoneyCents(
      row,
      [
        "effective_price_cents",
        "effectivePriceCents",
        "price_cents",
        "priceCents",
        "price_with_discount_cents",
        "priceWithDiscountCents",
        "discounted_price_cents",
        "discountedPriceCents",
        "final_price_cents",
        "finalPriceCents",
      ],
      [
        "price",
        "price_final",
        "priceFinal",
        "final_price",
        "finalPrice",
        "price_with_discount",
        "priceWithDiscount",
        "discounted_price",
        "discountedPrice",
      ],
    ) ?? 0;

  const originalPriceCents =
    pickMoneyCents(
      row,
      [
        "original_price_cents",
        "originalPriceCents",
        "base_price_cents",
        "basePriceCents",
        "list_price_cents",
        "listPriceCents",
        "price_before_discount_cents",
        "priceBeforeDiscountCents",
      ],
      [
        "original_price",
        "originalPrice",
        "base_price",
        "basePrice",
        "list_price",
        "listPrice",
        "price_before_discount",
        "priceBeforeDiscount",
      ],
    ) ?? basePriceCents;

  let discountPercent =
    normalizePercent(pickNumeric(row, ["discount_percent", "discountPercent"])) ??
    resolvePercentFromPrices(priceCents, originalPriceCents);

  const discountAmountCents =
    pickMoneyCents(
      row,
      [
        "discount_amount_cents",
        "discountAmountCents",
        "discount_cents",
        "discountCents",
      ],
      ["discount_amount", "discountAmount"],
    ) ?? resolveDiscountAmount(priceCents, originalPriceCents);

  const hasDiscountFlag = (() => {
    if (typeof (row as Record<string, unknown>)?.hasDiscount === "boolean") {
      return Boolean((row as Record<string, unknown>).hasDiscount);
    }
    if (
      typeof (row as Record<string, unknown>)?.has_discount === "boolean" &&
      (row as Record<string, unknown>).has_discount != null
    ) {
      return Boolean((row as Record<string, unknown>).has_discount);
    }
    return (
      (discountAmountCents != null && discountAmountCents > 0) ||
      (originalPriceCents != null && priceCents < originalPriceCents)
    );
  })();

  if (discountPercent == null || discountPercent <= 0) {
    if (
      discountAmountCents != null &&
      discountAmountCents > 0 &&
      originalPriceCents != null &&
      originalPriceCents > 0
    ) {
      discountPercent = Number(((discountAmountCents / originalPriceCents) * 100).toFixed(2));
    } else if (
      hasDiscountFlag &&
      originalPriceCents != null &&
      originalPriceCents > 0 &&
      priceCents < originalPriceCents
    ) {
      discountPercent = Number((((originalPriceCents - priceCents) / originalPriceCents) * 100).toFixed(2));
    }
  }

  const price = Math.max(0, priceCents) / 100;
  const effectiveOriginalCents =
    hasDiscountFlag && originalPriceCents != null && originalPriceCents > priceCents
      ? originalPriceCents
      : null;
  const originalPrice =
    effectiveOriginalCents != null && Number.isFinite(effectiveOriginalCents)
      ? Math.max(0, effectiveOriginalCents) / 100
      : null;

  return {
    price,
    priceCents: Math.max(0, Math.round(priceCents)),
    originalPrice,
    originalPriceCents:
      effectiveOriginalCents != null ? Math.max(0, Math.round(effectiveOriginalCents)) : null,
    discountPercent: discountPercent != null && discountPercent > 0 ? discountPercent : null,
    discountAmountCents:
      discountAmountCents != null && discountAmountCents > 0
        ? Math.round(discountAmountCents)
        : hasDiscountFlag && effectiveOriginalCents != null
          ? Math.max(0, Math.round(effectiveOriginalCents - priceCents))
          : null,
    basePriceCents:
      basePriceCents != null ? Math.max(0, Math.round(basePriceCents)) : originalPriceCents,
    hasDiscount: hasDiscountFlag,
  };
}

export function resolveCurrency(row: Record<string, unknown> | null | undefined): string | null {
  const value =
    (row as Record<string, unknown> | null | undefined)?.currency ??
    (row as Record<string, unknown> | null | undefined)?.currency_code ??
    (row as Record<string, unknown> | null | undefined)?.currencyCode ??
    null;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}
