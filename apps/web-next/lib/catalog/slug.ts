export function normalizeSlug(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")   // <-- фикс
    .trim()
    .replace(/[_\s]+/g, "-")            // <-- фикс
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function ensureCanonicalSlug(input: string): string {
  return normalizeSlug(input) ?? "";
}

export function isCanonicalSlug(input: string): boolean {
  const normalized = normalizeSlug(input);
  return Boolean(normalized && normalized === input);
}
