// src/components/layout/Footer.tsx

import Section from "@ui/components/common/section";
import { openConsent } from "@shared/lib/consent";
import UserBadge from "@ui/components/auth/UserBadge";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card/80 backdrop-blur-sm">
      <Section className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-sm text-muted shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <UserBadge />
        </div>

        <p className="max-w-xl text-sm text-[var(--text-dim)]">
          Some pages include product recommendations and optional sponsored placements.
        </p>
        <button
          type="button"
          onClick={() => openConsent()}
          className="text-sm font-medium text-[rgb(var(--primary))] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]"
        >
          Cookie settings
        </button>
      </Section>
    </footer>
  );
}

