// src/lib/sanitize.ts

const JS_PROTOCOL = /^\s*javascript\s*:/i;
const SCRIPT_TAG = /<\s*\/?\s*script[^>]*>/gi;
// eslint-disable-next-line no-control-regex -- Intentionally strip ASCII control chars U+0000..U+001F and U+007F
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * Normalize user-supplied search/query parameter values.
 * Removes dangerous protocol prefixes, strips script tags, and drops control characters.
 */
export function sanitizeSearchParam(value: string | null | undefined): string {
  if (!value) return "";
  let next = value.trim();
  if (JS_PROTOCOL.test(next)) {
    next = next.replace(JS_PROTOCOL, "");
  }
  next = next.replace(SCRIPT_TAG, "");
  next = next.replace(CONTROL_CHARS, "");
  return next;
}

/**
 * Boolean helper to detect whether a value was altered by sanitization.
 * Useful for telemetry or conditional logic.
 */
export function isSanitized(original: string | null | undefined, sanitized: string): boolean {
  if (!original) return false;
  return original.trim() !== sanitized;
}
