export type CurrencyCode = string;

export const FALLBACK_LOCALE = "ru-RU";

export function formatCurrency(value: number, currency: CurrencyCode = "EUR", locale: string = FALLBACK_LOCALE): string {
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
