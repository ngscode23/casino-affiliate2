import type { Metadata } from "next";
import OffersClient from "./offers-client";

export const metadata: Metadata = {
  title: "All casino offers – browse & filter",
  description: "Browse all casino affiliate offers, filter by license, and explore payout speeds for each partner.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "All casino offers – Neon Shop",
    description: "Browse all casino affiliate offers, filter by license, and explore payout speeds for each partner.",
    url: "/offers",
  },
};

export const dynamic = "force-dynamic";

export default function OffersPage() {
  return <OffersClient />;
}
