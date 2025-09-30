import type { Metadata } from "next";
import AffiliateHomeClient from "./affiliate-client";

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
  return <AffiliateHomeClient />;
}
