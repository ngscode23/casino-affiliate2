import { normalizeImageUrl } from "./[slug]/data";

type Row = Record<string, unknown> | null | undefined;

export function imageUrlFrom(row: Row): string | null {
  if (!row) return null;
  const source = row as Record<string, unknown>;
  const candidates: Array<unknown> = [
    source?.thumbnail,
    source?.thumbnail_path,
    source?.thumbnailPath,
    source?.main_image_url,
    source?.mainImageUrl,
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalized = normalizeImageUrl(trimmed);
    if (normalized) return normalized;
  }

  return null;
}
