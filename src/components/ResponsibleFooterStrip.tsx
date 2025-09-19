// src/components/ResponsibleFooterStrip.tsx
import { Link } from "react-router-dom";
import { useVertical } from "@/ctx/VerticalContext";
import { t } from "@/lib/t";

export default function ResponsibleFooterStrip() {
  const vertical = useVertical();
  const disclosure = vertical.disclosures?.footer ? t(vertical.disclosures.footer) : null;
  return (
    <div
      role="contentinfo"
      className="border-t border-white/10 bg-[var(--bg-0)] text-[var(--text-dim)]"
    >
      <div className="mx-auto max-w-6xl px-3 py-3 text-xs flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">18+</span>
          {disclosure ? (
            <span>{disclosure}</span>
          ) : (
            <span>
              Play responsibly. Help: <a className="underline" href="https://www.begambleaware.org/" rel="noopener" target="_blank">BeGambleAware</a>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="underline" to="/legal/responsible">Responsible Gaming</Link>
          <Link className="underline" to="/legal/affiliate-disclosure">Affiliate Disclosure</Link>
          <Link className="underline" to="/legal/privacy">Privacy</Link>
          <Link className="underline" to="/legal/terms">Terms</Link>
          <Link className="underline" to="/legal/cookies">Cookies</Link>
        </div>
      </div>
    </div>
  );
}


