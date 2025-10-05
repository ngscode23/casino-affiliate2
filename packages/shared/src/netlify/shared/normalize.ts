export function normalizeSku(input?: string, fallback?: string): string {
  let s = (input ?? fallback ?? '').toUpperCase().replace(/[^A-Z0-9_-]+/g, '_');
  s = s.replace(/_{2,}/g, '_').replace(/^[-_]+|[-_]+$/g, '');
  if (!/^[A-Z0-9]/.test(s) || s.length === 0) {
    s = 'SKU_' + Date.now().toString(36).toUpperCase();
  }
  return s;
}

export function slugifyTitle(title?: string, fallback?: string): string {
  const src = (title ?? fallback ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return src || `product-${Date.now().toString(36)}`;
}

