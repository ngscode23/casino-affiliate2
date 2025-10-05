import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Neon Shop and our affiliate tracking tools.",
};

export default function TermsPage() {
  return (
    <>
      <div className="space-y-3">
        <span className="tagline">Plain language</span>
        <h1 className="text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
        <p className="max-w-2xl text-sm text-[color:var(--ui-muted)]">
          These terms explain what you can expect from Neon Shop and what we expect in return. Please read them
          before creating an account or following our affiliate links.
        </p>
      </div>

      <SectionCard contentClassName="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Using the site</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            You agree to use Neon Shop for lawful purposes and in compliance with your local regulations.
            Content is provided as-is for research and comparison. Offers listed on the site may change or
            expire at any time.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Accounts</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            If you create an account you are responsible for keeping your credentials safe. We may suspend
            or remove accounts that abuse the platform or attempt to manipulate tracking data.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Affiliate relationships</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            Some links are affiliate links. We may receive a commission if you sign up through them. Our
            reviews remain independent and paid placements are labelled.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Liability</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            Neon Shop is provided without warranties. We are not responsible for losses that result from
            decisions you make after reading our content or using partner sites.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Updates</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            We may update these terms from time to time. If changes are material we will notify registered
            users by email and update the timestamp on this page.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
