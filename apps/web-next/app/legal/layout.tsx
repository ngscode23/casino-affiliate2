import type { ReactNode } from "react";
import PageShell from "@ui/components/ui/PageShell";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell className="text-fg">
      <div className="space-y-8">{children}</div>
    </PageShell>
  );
}
