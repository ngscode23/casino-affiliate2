import { useCallback } from "react";

import { logRecEvent } from "@/lib/recs-events";

export function useHeaderTracking() {
  const trackSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    void logRecEvent({
      event: "search",
      metadata: { query: trimmed, source: "header_search" },
    });
  }, []);

  return { trackSearch };
}
