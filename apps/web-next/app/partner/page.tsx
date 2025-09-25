import type { Metadata } from "next";
import PartnerPortalClient from "./partner-client";

export const metadata: Metadata = {
  title: "Partner Portal",
  description: "Access pinned offers and manage billing for your partner account.",
};

export default function PartnerPortalPage() {
  return <PartnerPortalClient />;
}