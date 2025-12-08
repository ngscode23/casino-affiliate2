const BRAND_ALIASES: Record<string, string> = {
  xiaomi: "xiomi",
  xiomi: "xiomi",
  "google pixel": "google-pixel",
  "google-pixel": "google-pixel",
};

export function normalizeBrandSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const collapsed = trimmed.replace(/\s+/g, "-");
  return BRAND_ALIASES[collapsed] ?? collapsed;
}

export function brandLabelFromSlug(slug: string | null | undefined, fallback?: string | null): string {
  const normalized = normalizeBrandSlug(slug);
  if (!normalized) return fallback?.trim() || "Unknown";
  if (normalized === "xiomi") return "Xiaomi";
  if (normalized === "google-pixel") return "Google Pixel";
  return humanize(normalized);
}

function humanize(input: string): string {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
