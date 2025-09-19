import React from "react";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={"inline-flex items-center gap-2 " + className}>
      <button
        type="button"
        className={[
          "rounded-xl px-3 py-1.5 border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
          lang === "en" ? "border-white/15 bg-white/10 text-[var(--text)]" : "border-white/10 text-neutral-300 hover:bg-white/5",
        ].join(" ")}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label="Switch language to English"
      >
        EN
      </button>
      <button
        type="button"
        className={[
          "rounded-xl px-3 py-1.5 border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
          lang === "ru" ? "border-white/15 bg-white/10 text-[var(--text)]" : "border-white/10 text-neutral-300 hover:bg-white/5",
        ].join(" ")}
        onClick={() => setLang("ru")}
        aria-pressed={lang === "ru"}
        aria-label="Переключить язык на Русский"
      >
        RU
      </button>
    </div>
  );
}

export default LanguageSwitcher;
