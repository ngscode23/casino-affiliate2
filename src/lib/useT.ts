// src/lib/useT.ts
import { useI18n } from "@/lib/i18n";
import { t as translate, type Lang } from "@/lib/t";

export function useT() {
  const { lang } = useI18n();
  return (key: string, overrideLang?: Lang) => translate(key, overrideLang ?? lang);
}

