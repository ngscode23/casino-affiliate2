import { formatCurrency } from "./currency";

export function formatPrice(
  priceCents: number | null | undefined,
  currency: string | null | undefined,
): string {
  const price = Number(priceCents ?? 0) / 100;
  const cur = (currency ?? "EUR").toUpperCase();
  return formatCurrency(price, cur);
}
