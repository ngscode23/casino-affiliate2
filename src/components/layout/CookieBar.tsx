// src/components/layout/CookieBar.tsx
import { useEffect, useState } from "react";
import Section from "@/components/common/section";
import { getCookie, setCookie } from "@/lib/cookies";
import { enableAnalytics } from "@/lib/analytics";

type Props = { className?: string };

// cookie keys & версия политики — если изменишь текст/логику, подними версию
const CK_ANALYTICS = "cc_analytics";
const CK_MARKETING = "cc_marketing";
const CK_VER = "cc_version";
const POLICY_VER = "1";

// утилита: выставляем data-* атрибуты и уведомляем подписчиков
function applyConsentAttrs(analytics: boolean, marketing: boolean) {
  try {
    document.documentElement.setAttribute(
      "data-analytics-consent",
      analytics ? "granted" : "denied",
    );
    document.documentElement.setAttribute(
      "data-marketing-consent",
      marketing ? "granted" : "denied",
    );
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", { detail: { analytics, marketing } }),
    );
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[CookieBar] applyConsentAttrs failed:", e);
  }
}

// утилита: сохранить куки, проставить атрибуты и включить аналитику при согласии
function persistConsent(analytics: boolean, marketing: boolean) {
  try {
    setCookie(CK_ANALYTICS, analytics ? "1" : "0", { maxAgeDays: 365 });
    setCookie(CK_MARKETING, marketing ? "1" : "0", { maxAgeDays: 365 });
    setCookie(CK_VER, POLICY_VER, { maxAgeDays: 365 });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[CookieBar] persistConsent failed:", e);
  }

  applyConsentAttrs(analytics, marketing);

  // включаем SDK аналитики только при явном согласии на аналитику
  if (analytics) {
    try {
      enableAnalytics();
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[CookieBar] enableAnalytics error:", e);
    }
  }
}

export default function CookieBar({ className = "" }: Props) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // при загрузке читаем сохранённое согласие
  useEffect(() => {
    try {
      const ver = getCookie(CK_VER);
      const a = getCookie(CK_ANALYTICS);
      const m = getCookie(CK_MARKETING);

      // если уже есть согласие текущей версии — применяем и не показываем бар
      if (ver === POLICY_VER && (a !== null || m !== null)) {
        const aOk = a === "1";
        const mOk = m === "1";
        applyConsentAttrs(aOk, mOk);

        if (aOk) {
          // если пользователь ранее соглашался на аналитику — инициализируем SDK
          try {
            enableAnalytics();
          } catch (e) {
            if (import.meta.env.DEV) console.warn("[CookieBar] enableAnalytics error:", e);
          }
        }

        setVisible(false);
        return;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[CookieBar] init read error:", e);
    }

    // иначе показываем бар
    setVisible(true);
  }, []);

  if (!visible) return null;

  const onOnlyNecessary = () => {
    persistConsent(false, false);
    setVisible(false);
  };

  const onAcceptAll = () => {
    persistConsent(true, true);
    setVisible(false);
  };

  const onSaveSelection = () => {
    persistConsent(analytics, marketing);
    setVisible(false);
  };

  return (
    <div className={`fixed inset-x-0 bottom-0 z-[70] ${className}`}>
      <Section className="px-0">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[var(--bg-1)]/95 backdrop-blur p-4 shadow-[0_12px_32px_rgba(0,0,0,.45)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-sm leading-relaxed">
              Мы используем cookies для работы сайта и аналитики. Нажимая{" "}
              <b>Accept all</b>, вы соглашаетесь на аналитические и маркетинговые cookies.{" "}
              Или откройте{" "}
              <button
                type="button"
                className="underline cursor-pointer"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="cookie-settings"
              >
                Settings
              </button>
              .
            </div>

            <div className="flex gap-2 shrink-0 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={onOnlyNecessary}
                aria-label="Only necessary"
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Only necessary
              </button>
              <button
                type="button"
                onClick={onAcceptAll}
                aria-label="Accept all"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Accept all
              </button>
            </div>
          </div>

          {expanded && (
            <div
              id="cookie-settings"
              className="mt-4 rounded-xl border border-white/10 bg-[var(--bg-0)] p-3"
              role="group"
              aria-label="Cookie settings"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked disabled className="mt-1" />
                  <div>
                    <div className="font-medium">Necessary</div>
                    <div className="text-xs text-[var(--text-dim)]">
                      Нужны для базовой работы сайта. Всегда включены.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.currentTarget.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Analytics</div>
                    <div className="text-xs text-[var(--text-dim)]">
                      Помогают понять поведение пользователей.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.currentTarget.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Marketing</div>
                    <div className="text-xs text-[var(--text-dim)]">
                      Ретаргетинг, персональные офферы.
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Hide settings"
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveSelection}
                  aria-label="Save selection"
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Save selection
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}