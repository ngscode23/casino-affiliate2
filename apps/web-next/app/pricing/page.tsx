import type { Metadata } from "next";

import PricingPageClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing - Casino Watch",
  description: "Choose a plan and start promoting your offers.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing",
    description: "Choose a plan and start promoting your offers.",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
