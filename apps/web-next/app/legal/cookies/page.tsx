import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";

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
        <span className="tagline">Transparent tracking</span>
        <h1 className="text-3xl font-semibold sm:text-4xl">Cookie Notice</h1>
        <p className="max-w-2xl text-sm text-[color:var(--ui-muted)]">
          We keep cookies to a minimum. The table below lists what we set, why we set it, and how long it stays.
        </p>
      </div>

      <SectionCard contentClassName="space-y-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-[color:var(--ui-muted)]">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr>
                <td className="px-4 py-3 text-white">sb-casino-affiliate-auth</td>
                <td className="px-4 py-3">Keeps you signed in with Supabase across sessions.</td>
                <td className="px-4 py-3">1 week</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white">ns-consent</td>
                <td className="px-4 py-3">Stores your cookie consent preference.</td>
                <td className="px-4 py-3">6 months</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white">ns-analytics</td>
                <td className="px-4 py-3">Optional analytics cookie activated only after consent.</td>
                <td className="px-4 py-3">24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Managing cookies</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            You can clear cookies at any time from your browser settings. Optional analytics starts disabled until
            you accept it in the consent banner. Revoking consent removes the analytics cookie immediately.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
