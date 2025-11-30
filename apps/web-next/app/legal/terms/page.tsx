import { sectionTitle, mutedTextSmLegacy } from "@/styles/classnames";
import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";
import Tagline from "@/components/tagline";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Neon Shop and our affiliate tracking tools.",
};

export default function TermsPage() {
  return (
    <>
      <div className="space-y-3">
        <Tagline>Plain language</Tagline>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Terms of Service</h1>
        <p className="max-w-2xl text-sm text-muted">
          These terms explain what you can expect from Neon Shop and what we expect in return. Please read them
          before creating an account or following our affiliate links.
        </p>
      </div>
      <SectionCard contentClassName="space-y-6">
        <div className="space-y-2">
          <h2 className={sectionTitle}>Using the site</h2>
          <p className={mutedTextSmLegacy}>
            You agree to use Neon Shop for lawful purposes and in compliance with your local regulations.
            Content is provided as-is for research and comparison. Offers listed on the site may change or
            expire at any time.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Accounts</h2>
          <p className={mutedTextSmLegacy}>
            If you create an account you are responsible for keeping your credentials safe. We may suspend
            or remove accounts that abuse the platform or attempt to manipulate tracking data.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Affiliate relationships</h2>
          <p className={mutedTextSmLegacy}>
            Some links are affiliate links. We may receive a commission if you sign up through them. Our
            reviews remain independent and paid placements are labelled.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Liability</h2>
          <p className={mutedTextSmLegacy}>
            Neon Shop is provided without warranties. We are not responsible for losses that result from
            decisions you make after reading our content or using partner sites.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Updates</h2>
          <p className={mutedTextSmLegacy}>
            We may update these terms from time to time. If changes are material we will notify registered
            users by email and update the timestamp on this page.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
