// src/features/offers/api/useOffers.ts
import { useEffect, useState } from "react";
import type { NormalizedOffer } from "@shared/lib/offers";
import { getOffers } from "./getOffers";

// simple in-memory cache to avoid refetching across multiple mounts/pages
let __offersCache: { data: NormalizedOffer[]; ts: number } | null = null;
let __offersPending: Promise<NormalizedOffer[]> | null = null;
const OFFERS_TTL_MS = 60 * 1000; // 1 minute

export function useOffers() {
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        const now = Date.now();
        const cached = __offersCache && now - __offersCache.ts < OFFERS_TTL_MS ? __offersCache.data : null;
        const data = cached
          ? cached
          : (__offersPending ||= getOffers().then((res) => {
              __offersCache = { data: res, ts: Date.now() };
              __offersPending = null;
              return res;
            }));
        const resolved = Array.isArray(data) ? data : await data;
        if (!cancelled) {
          setOffers(resolved);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load offers");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { offers, isLoading, error };
}

// опционально реэкспорт типа, удобно в потребителях
export type { NormalizedOffer };



