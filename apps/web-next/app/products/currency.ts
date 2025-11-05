const FALLBACK_LOCALE = "ru-RU";

export function formatCurrency(value: number, currency = "EUR", locale = FALLBACK_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, {
      style: "currency",
      currency: currency || "EUR",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency || "EUR"}`;
  }
}

export { FALLBACK_LOCALE };
