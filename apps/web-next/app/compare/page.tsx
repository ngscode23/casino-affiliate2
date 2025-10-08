import { Suspense } from "react";
import type { Metadata } from "next";

import ComparePageClient from "./compare-client";

export const metadata: Metadata = {
  title: "Compare offers - smart filters",
  description: "Compare casino affiliate offers with dynamic filters, columns and sorting.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare offers",
    description: "Side-by-side comparison of casino affiliate offers.",
    url: "/compare",
  },
};

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageClient />
    </Suspense>
  );
}
