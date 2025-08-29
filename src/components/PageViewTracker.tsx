// src/components/PageViewTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/analytics";

export function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      trackPageview(pathname);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[PageViewTracker] pageview failed:", e);
    }
  }, [pathname]);

  return null;
}
export default PageViewTracker;