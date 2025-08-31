// src/components/layout/CookieBar.tsx
import { useEffect, useState } from "react";
import Section from "@/components/common/section";
import { getConsent as getStoredConsent, setConsent as saveConsent, applyStoredConsentToDom } from "@/lib/consent";

type Props = { className?: string };

// Persist consent in localStorage and emit events; do not directly init analytics here
function persistConsent(analytics: boolean, marketing: boolean) {
  try { saveConsent({ analytics, marketing }); } catch {}
}

export default function CookieBar({ className = "" }: Props) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // Init: apply stored consent to DOM and hide bar if present
  useEffect(() => {
    try {
      applyStoredConsentToDom();
      const c = getStoredConsent();
      if (c) { setVisible(false); return; }
    } catch {}
    setVisible(true);
  }, []);

  useEffect(() => {
    const onOpen = () => { setExpanded(true); setVisible(true); };
    window.addEventListener('consent:open', onOpen);
    return () => window.removeEventListener('consent:open', onOpen);
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
              We use cookies to improve your experience. Click <b>Accept all</b> to enable analytics and marketing cookies. Manage settings below.
              <button
                type="button"
                className="ml-2 underline cursor-pointer"
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
                      Required for basic site functionality.
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
                      Helps us understand site usage.
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
                      Personalization and ads.
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
