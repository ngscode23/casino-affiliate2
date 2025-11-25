import type { Metadata } from "next";
import { Suspense } from "react";
import AffiliateHomeClient from "./affiliate-client";
import { AffiliateSkeleton } from "./AffiliateSkeleton";

const origin = process.env.NEXT_SITE_URL?.replace(/\/$/, "") || "https://neonshop.dev";
const canonical = `${origin}/affiliate`;

export const metadata: Metadata = {
  title: "Affiliate program overview",
  description: "Scale affiliate campaigns with vetted partners, payout insights, and localisation guidance.",
  alternates: {
    canonical,
    languages: {
      en: `${canonical}?lang=en`,
      ru: `${canonical}?lang=ru`,
    },
  },
  openGraph: {
    title: "Affiliate program overview",
    description: "Scale affiliate campaigns with vetted partners, payout insights, and localisation guidance.",
    url: canonical,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AffiliatePage() {
  return (
    <Suspense fallback={<AffiliateSkeleton />}>
      <AffiliateHomeClient />
    </Suspense>
  );
}
