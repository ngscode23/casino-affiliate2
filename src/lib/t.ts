// src/lib/t.ts
import ru from "@/i18n/ru.json";
import en from "@/i18n/en.json";

// tsconfig.json:
// "compilerOptions": { "resolveJsonModule": true, "esModuleInterop": true }
// Если у тебя строгий ESLint/SSR: оберни localStorage вызовы try/catch.

export type Lang = "ru" | "en";

// Рекурсивные типы: интерфейс для объекта + alias для узла.
// Так избегаем TS2456 ("type alias recursively references itself").
export type I18nNode = string | I18nMap;
export interface I18nMap {
  [key: string]: I18nNode;
}

// Безопасный флэт: "nav.home" -> "Главная"
function flattenI18n(node: I18nNode, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof node === "string") {
    if (prefix) out[prefix] = node;
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenI18n(v as I18nMap, key));
    }
  }
  return out;
}

// Превращаем JSON-деревья в плоские словари без "as Record<string,string>"
const dictFlat: Record<Lang, Record<string, string>> = {
  en: flattenI18n(en as unknown as I18nMap),
  ru: flattenI18n(ru as unknown as I18nMap)
};

// Хранение выбранного языка (опционально)
const LS_KEY = "lang";
let currentLang: Lang = (() => {
  try {
    return (localStorage.getItem(LS_KEY) as Lang) || "en";
  } catch {
    return "en";
  }
})();

export function getLang(): Lang {
  return currentLang;
}
export function setLang(lang: Lang) {
  currentLang = lang;
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    /* забили: может быть SSR/приватный режим */
  }
}

/**
 * Перевод с фолбэками:
 * 1) выбранный язык -> 2) en -> 3) ru -> 4) сам ключ
 */
export function t(key: string, lang: Lang = currentLang): string {
  return (
    dictFlat[lang]?.[key] ??
    dictFlat.en?.[key] ??
    dictFlat.ru?.[key] ??
    key
  );
}



