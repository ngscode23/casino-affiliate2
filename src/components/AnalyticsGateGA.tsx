// src/components/AnalyticsGateGA.tsx
import { useEffect } from "react";
import {
  GA_ID,
  enableAnalytics,
  getConsent,
  onConsentChanged,
  setGaReady,
} from "@/lib/analytics";

export default function AnalyticsGateGA() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Если нет GA_ID — тихо выходим
    if (!GA_ID) {
      if (import.meta.env.DEV) console.info("[AnalyticsGateGA] GA_ID is empty, skip");
      return;
    }

    // Уже инициализировано? тогда только помечаем готовность и синхронизируем consent
    if (typeof window.gtag === "function") {
      setGaReady(true);
      syncConsentWithGA();
      maybeEnableAfterConsent();
      return;
    }

    // 1) Подключаем gtag.js
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    script.onload = () => {
      bootstrapGtag();
      setGaReady(true);
      syncConsentWithGA();
      maybeEnableAfterConsent();
    };
    script.onerror = () => {
      if (import.meta.env.DEV) console.warn("[AnalyticsGateGA] failed to load gtag.js");
    };
    document.head.appendChild(script);

    // 2) Подписка на изменения consent из CookieBar
    const off = onConsentChanged(() => {
      syncConsentWithGA();
      maybeEnableAfterConsent();
    });

    return () => {
      off?.();
      // Скрипт не удаляем, чтобы не плодить инициализации при навигации
    };
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

  // Стартуем с запретом хранения до явного согласия
  window.gtag!("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted", // чтобы не ломать базовые куки
    security_storage: "granted",
  });

  window.gtag!("config", GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

function syncConsentWithGA() {
  const consent = getConsent(); // { analytics, marketing }
  // Приводим GA consent к нашему состоянию
  window.gtag?.("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
  });
}

function maybeEnableAfterConsent() {
  const consent = getConsent();
  // Разрешили аналитику? включаем наш общий флаг и инициализируем PostHog
  if (consent.analytics) {
    enableAnalytics();
  }
}