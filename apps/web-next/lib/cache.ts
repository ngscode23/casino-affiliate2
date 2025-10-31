"use server";

// Centralized cache invalidation wrapper
// One place to tweak when Next changes signatures again.

import { revalidateTag as _revalidateTag } from "next/cache";

export type CacheProfile = string | { expire?: number };

/**
 * Server-only safe wrapper around next/cache revalidateTag.
 * Swallows failures in non-prod to avoid exploding local/dev/test.
 */
export function revalidate(tag: string, profile: CacheProfile = {}): void {
  // Guard against accidental client-side calls
  const hasWindow = typeof globalThis !== "undefined" && Object.prototype.hasOwnProperty.call(globalThis, "window");
  if (hasWindow) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("revalidate() called on client, ignored:", tag);
    }
    return;
  }
  try {
    _revalidateTag(tag, profile);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("revalidate() failed:", tag, err);
    }
  }
}

/** Revalidate many tags at once. */
export function revalidateMany(tags: string[], profile: CacheProfile = {}): void {
  for (const t of tags) revalidate(t, profile);
}
