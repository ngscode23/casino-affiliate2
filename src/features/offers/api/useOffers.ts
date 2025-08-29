// src/features/offers/api/useOffers.ts
import { useEffect, useState } from "react";
import type { NormalizedOffer } from "@/lib/offers";
import { getOffers } from "./getOffers";

export function useOffers() {
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        const data = await getOffers();
        if (!cancelled) {
          setOffers(data);
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


