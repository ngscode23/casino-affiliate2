// src/lib/usePageView.ts
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { trackPageview } from "@/lib/analytics";

export function usePageView() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    try {
      trackPageview(location.pathname);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[usePageView] failed:", e);
    }
  }, [location.pathname, navType]);
}

