import { sectionTitle, mutedTextSmLegacy } from "@/styles/classnames";
import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";
import Tagline from "@/components/tagline";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "What cookies Neon Shop sets and how to manage your preferences.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CookiesPage() {
  return (
    <>
      <div className="space-y-3">
        <Tagline>Transparent tracking</Tagline>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Cookie Notice</h1>
        <p className="max-w-2xl text-sm text-muted">
          We keep cookies to a minimum. The table below lists what we set, why we set it, and how long it stays.
        </p>
      </div>
      <SectionCard contentClassName="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border/40">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-card/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="px-4 py-3 text-fg">sb-casino-affiliate-auth</td>
                <td className="px-4 py-3">Keeps you signed in with Supabase across sessions.</td>
                <td className="px-4 py-3">1 week</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-fg">ns-consent</td>
                <td className="px-4 py-3">Stores your cookie consent preference.</td>
                <td className="px-4 py-3">6 months</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-fg">ns-analytics</td>
                <td className="px-4 py-3">Optional analytics cookie activated only after consent.</td>
                <td className="px-4 py-3">24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Managing cookies</h2>
          <p className={mutedTextSmLegacy}>
            You can clear cookies at any time from your browser settings. Optional analytics starts disabled until
            you accept it in the consent banner. Revoking consent removes the analytics cookie immediately.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
