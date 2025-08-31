import React from "react";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={"inline-flex items-center gap-1 " + className}>
      <button
        type="button"
        className={`rounded-lg px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${lang === "en" ? "bg-white/15 text-[var(--text)]" : "text-[var(--text-dim)]"}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label="Switch language to English"
      >
        EN
      </button>
      <button
        type="button"
        className={`rounded-lg px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${lang === "ru" ? "bg-white/15 text-[var(--text)]" : "text-[var(--text-dim)]"}`}
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

