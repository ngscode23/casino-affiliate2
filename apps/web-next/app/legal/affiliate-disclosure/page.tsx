import { sectionTitle, mutedTextSmLegacy } from "@/styles/classnames";
import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";
import Tagline from "@/components/tagline";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "Understanding how Neon Shop earns commissions and how that impacts reviews.",
};

export default function AffiliateDisclosurePage() {
  return (
    <>
      <div className="space-y-3">
        <Tagline>Radical transparency</Tagline>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Affiliate Disclosure</h1>
        <p className="max-w-2xl text-sm text-muted">
          Neon Shop is free to use. To keep the lights on we rely on carefully selected affiliate partnerships.
          Here is what that means for you.
        </p>
      </div>
      <SectionCard contentClassName="space-y-5">
        <div className="space-y-2">
          <h2 className={sectionTitle}>How commissions work</h2>
          <p className={mutedTextSmLegacy}>
            When you follow certain links on Neon Shop and sign up with a partner we might earn a commission.
            There is no additional cost to you. Commission payments do not influence the data we publish or the
            way we rank products.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Editorial independence</h2>
          <p className={mutedTextSmLegacy}>
            Reviews and comparison tables are created by our research team. Partners can suggest corrections but
            cannot buy a higher position. Sponsored placements, when available, are clearly labelled.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={sectionTitle}>Why we disclose</h2>
          <p className={mutedTextSmLegacy}>
            Disclosure is required by law in many jurisdictions and, more importantly, it builds trust. If you ever
            spot an affiliate link that is not labelled, please email <a className="underline" href="mailto:hello@neonshop.dev">hello@neonshop.dev</a>.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
