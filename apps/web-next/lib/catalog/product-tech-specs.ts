const DEFAULT_TITLE = "Технические характеристики";

export type ProductTechRow = { name: string; value: string };
export type ProductTechSection = { id: string; title: string; rows: ProductTechRow[] };
export type ProductTechSpecs = { title?: string | null; sections: ProductTechSection[] };

function coerceString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function slugifyId(value: string): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function generateSectionId(seed?: string): string {
  const base = slugifyId(seed ?? "");
  const random = Math.random().toString(36).slice(2, 6);
  return `${base || "section"}-${random}`;
}

function cloneRows(rowsInput: unknown): ProductTechRow[] {
  const rows: ProductTechRow[] = [];
  if (!Array.isArray(rowsInput)) return rows;
  for (const entry of rowsInput) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = coerceString(record.name ?? record.title ?? record.key ?? "");
    const value = coerceString(record.value ?? record.data ?? record.description ?? "");
    if (!name || !value) continue;
    rows.push({ name, value });
  }
  return rows;
}

function buildSection(entry: unknown, index: number): ProductTechSection | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const rows = cloneRows(record.rows);
  if (!rows.length) return null;
  const title = coerceString(record.title ?? record.name ?? "") || `Section ${index + 1}`;
  const id = coerceString(record.id) || generateSectionId(title);
  return { id, title, rows };
}

export function normalizeProductTechSpecs(input: unknown): ProductTechSpecs | null {
  if (input == null) return null;
  let source = input;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const sectionsInput = Array.isArray(record.sections) ? record.sections : [];
  const sections: ProductTechSection[] = [];
  sectionsInput.forEach((section, index) => {
    const built = buildSection(section, index);
    if (built) sections.push(built);
  });
  if (!sections.length) return null;
  return {
    title: coerceString(record.title) || DEFAULT_TITLE,
    sections,
  };
}

export function sanitizeProductTechSpecs(input: ProductTechSpecs | null | undefined): ProductTechSpecs | null {
  return normalizeProductTechSpecs(input ?? null);
}

export function createEmptyProductTechSpecs(): ProductTechSpecs {
  return { title: DEFAULT_TITLE, sections: [] };
}

export const DEFAULT_PRODUCT_TECH_TITLE = DEFAULT_TITLE;
