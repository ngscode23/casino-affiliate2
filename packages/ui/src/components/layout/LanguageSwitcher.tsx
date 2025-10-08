import React from "react";
import { useI18n } from "@shared/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  const baseClasses =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const activeClasses = "border-primary/50 bg-primary/15 text-primary shadow-[0_14px_38px_-24px_rgba(252,50,114,0.36)]";
  const inactiveClasses = "border-border/40 text-muted hover:border-primary/30 hover:text-primary";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        className={`${baseClasses} ${lang === "en" ? activeClasses : inactiveClasses}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label="Switch language to English"
      >
        EN
      </button>
      <button
        type="button"
        className={`${baseClasses} ${lang === "ru" ? activeClasses : inactiveClasses}`}
        onClick={() => setLang("ru")}
        aria-pressed={lang === "ru"}
        aria-label="Switch language to Russian"
      >
        RU
      </button>
    </div>
  );
}

export default LanguageSwitcher;
