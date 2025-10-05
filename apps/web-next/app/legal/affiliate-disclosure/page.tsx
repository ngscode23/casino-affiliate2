import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "Understanding how Neon Shop earns commissions and how that impacts reviews.",
};

export default function AffiliateDisclosurePage() {
  return (
    <>
      <div className="space-y-3">
        <span className="tagline">Radical transparency</span>
        <h1 className="text-3xl font-semibold sm:text-4xl">Affiliate Disclosure</h1>
        <p className="max-w-2xl text-sm text-[color:var(--ui-muted)]">
          Neon Shop is free to use. To keep the lights on we rely on carefully selected affiliate partnerships.
          Here is what that means for you.
        </p>
      </div>

      <SectionCard contentClassName="space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">How commissions work</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            When you follow certain links on Neon Shop and sign up with a partner we might earn a commission.
            There is no additional cost to you. Commission payments do not influence the data we publish or the
            way we rank products.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Editorial independence</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            Reviews and comparison tables are created by our research team. Partners can suggest corrections but
            cannot buy a higher position. Sponsored placements, when available, are clearly labelled.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Why we disclose</h2>
          <p className="text-sm text-[color:var(--ui-muted)]">
            Disclosure is required by law in many jurisdictions and, more importantly, it builds trust. If you ever
            spot an affiliate link that is not labelled, please email <a className="underline" href="mailto:hello@neonshop.dev">hello@neonshop.dev</a>.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
