// src/lib/impressions.ts
// Track impressions only when elements are visible via IntersectionObserver

import { useEffect, useRef } from 'react';
import { fn } from '@/lib/functions';

const fired = new Set<string>();
let io: IntersectionObserver | null = null;
const pending = new Map<Element, string>(); // element -> slug

function getObserver(): IntersectionObserver {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const slug = pending.get(el);
      if (slug && !fired.has(slug)) {
        fired.add(slug);
        fetch(fn('track-impression'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug })
        }).catch(() => void 0);
      }
      if (io) io.unobserve(el);
      pending.delete(el);
    }
  }, { rootMargin: '0px', threshold: 0.25 });
  return io;
}

export function observeImpression(el: Element | null, slug: string) {
  if (!el || !slug || fired.has(slug)) return;
  pending.set(el, slug);
  getObserver().observe(el);
}

export function useImpression(slug: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    observeImpression(el, slug);
    return () => { if (io && el) io.unobserve(el); };
  }, [slug]);
  return ref;
}

// Fallback one-shot tracker if needed elsewhere
export async function trackImpression(slug: string): Promise<void> {
  try {
    if (!slug || fired.has(slug)) return;
    fired.add(slug);
    await fetch(fn('track-impression'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug })
    }).catch(() => void 0);
  } catch { void 0 }
}
