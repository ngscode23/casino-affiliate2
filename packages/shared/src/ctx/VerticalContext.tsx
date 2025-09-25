import * as React from "react";
import casinoVertical from "@shared/verticals/casino";
import hostingVertical from "@shared/verticals/hosting";
import type { VerticalConfig } from "@shared/verticals/types";

const REGISTRY: Record<string, VerticalConfig> = {
  hosting: hostingVertical,
  // casino: casinoVertical, // temporarily disabled
};

function resolveVertical(): VerticalConfig {
  try {
    const qs = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
    const v = (qs.get("vertical") || "hosting").toLowerCase();
    return REGISTRY[v] || REGISTRY.hosting;
  } catch {
    return REGISTRY.hosting;
  }
}

function applyBranding(branding: VerticalConfig["branding"]) {
  try {
    const root = document.documentElement;
    if (branding.primary) root.style.setProperty("--brand", branding.primary);
    if (branding.primaryFg) root.style.setProperty("--brand-fg", branding.primaryFg);
  } catch { /* noop in SSR/tests */ }
}

const VerticalContext = React.createContext<VerticalConfig>(hostingVertical);

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = React.useState<VerticalConfig>(resolveVertical());

  React.useEffect(() => {
    applyBranding(cfg.branding);
  }, [cfg.branding.primary, cfg.branding.primaryFg]);

  React.useEffect(() => {
    // listen for URL changes (popstate)
    function onPop() { setCfg(resolveVertical()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return <VerticalContext.Provider value={cfg}>{children}</VerticalContext.Provider>;
}

export function useVertical(): VerticalConfig {
  return React.useContext(VerticalContext);
}


