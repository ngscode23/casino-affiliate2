export function formatPrice(value: number, currency = "EUR") {
  if (!Number.isFinite(value)) {
    return "-";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const fallback = value.toFixed(2);
    return `${fallback} ${currency}`;
  }
}
