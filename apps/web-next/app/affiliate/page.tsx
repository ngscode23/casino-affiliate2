import type { Metadata } from "next";
import AffiliateHomeClient from "./affiliate-client";

export const metadata: Metadata = {
  title: "Affiliate program overview",
  description: "Launch casino affiliate campaigns with vetted partners, payout insights, and localisation guides.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AffiliatePage() {
  return <AffiliateHomeClient />;
}
