// src/lib/i18n.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hydrateLangFromStorage, setLang as setLangInStore, type Lang } from "@shared/lib/t";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = hydrateLangFromStorage();
    setLangState(initial);
  }, []);

  const setLang = (l: Lang) => {
    setLangInStore(l);
    setLangState(l);
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", l);
        window.history.replaceState({}, "", url.toString());
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch { /* ignore */ }
  }, [lang]);

  // On first load, accept ?lang= from URL to make hreflang/alternate URLs functional
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const ql = url.searchParams.get("lang") as Lang | null;
      if (ql && (ql === "en" || ql === "ru") && ql !== lang) {
        setLang(ql);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

