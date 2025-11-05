"use server";

// Centralized cache invalidation wrapper
// One place to tweak when Next changes signatures again.

import { revalidateTag as _revalidateTag } from "next/cache";

export type CacheProfile = string | { expire?: number };

/**
 * Server-only safe wrapper around next/cache revalidateTag.
 * Swallows failures in non-prod to avoid exploding local/dev/test.
 */
export async function revalidate(tag: string, profile: CacheProfile = {}): Promise<void> {
  // Guard against accidental client-side calls
  const hasWindow = typeof globalThis !== "undefined" && Object.prototype.hasOwnProperty.call(globalThis, "window");
  if (hasWindow) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("revalidate() called on client, ignored:", tag);
    }
    return;
  }
  try {
    await _revalidateTag(tag, profile);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("revalidate() failed:", tag, err);
    }
  }
}

/** Revalidate many tags at once. */
export async function revalidateMany(tags: string[], profile: CacheProfile = {}): Promise<void> {
  for (const t of tags) {
    await revalidate(t, profile);
  }
}
