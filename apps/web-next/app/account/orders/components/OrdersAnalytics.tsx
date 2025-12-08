import { useEffect, useRef } from "react";

import { track } from "@shared/lib/analytics";

type OrdersAnalyticsProps = {
  status: string;
  searchValue: string;
  limit: number;
  total: number;
  count: number;
};

export function OrdersAnalytics({ status, searchValue, limit, total, count }: OrdersAnalyticsProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    try {
      if (!mountedRef.current) {
        mountedRef.current = true;
        track("orders:view", { total });
        return;
      }
      track("orders:filters_changed", { status, q: searchValue, limit, total, count });
    } catch {
      /* noop */
    }
  }, [status, searchValue, limit, total, count]);

  return null;
}
