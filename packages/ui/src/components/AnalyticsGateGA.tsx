// src/components/AnalyticsGateGA.tsx
import { useEffect, useRef } from "react";
import { GA_ID, enableAnalytics, setGaReady } from "@shared/lib/analytics";
import { getConsent, onConsentChanged, applyStoredConsentToDom } from "@shared/lib/consent";

export default function AnalyticsGateGA() {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!GA_ID) {
      if (import.meta.env.DEV) console.info("[AnalyticsGateGA] GA_ID is empty, skip");
      return;
    }

    // Ensure DOM consent reflects stored value
    applyStoredConsentToDom();

    const inject = () => {
      if (loadedRef.current || typeof window.gtag === "function") return;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
      script.onload = () => {
        loadedRef.current = true;
        bootstrapGtag();
        setGaReady(true);
        syncConsentWithGA();
        maybeEnableAfterConsent();
      };
      script.onerror = () => {
        if (import.meta.env.DEV) console.warn("[AnalyticsGateGA] failed to load gtag.js");
      };
      document.head.appendChild(script);
    };

    const initial = getConsent();
    if (typeof window.gtag === "function") {
      setGaReady(true);
      syncConsentWithGA();
      maybeEnableAfterConsent();
    } else if (initial?.analytics) {
      inject();
    }

    const off = onConsentChanged((c) => {
      if (c?.analytics) inject();
      else syncConsentWithGA();
    });

    return () => off?.();
  }, []);

  return null;
}

/* ---------------- helpers ---------------- */

function bootstrapGtag() {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    (window as any).dataLayer.push(arguments);
  };

  window.gtag!("js", new Date());
  // Default to denied until user grants consent
  window.gtag!("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });

  window.gtag!("config", GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

function syncConsentWithGA() {
  const consent = getConsent(); // { analytics, marketing }
  window.gtag?.("consent", "update", {
    analytics_storage: consent?.analytics ? "granted" : "denied",
    ad_storage: consent?.marketing ? "granted" : "denied",
    ad_user_data: consent?.marketing ? "granted" : "denied",
    ad_personalization: consent?.marketing ? "granted" : "denied",
  });
}

function maybeEnableAfterConsent() {
  const consent = getConsent();
  if (consent?.analytics) enableAnalytics();
}


