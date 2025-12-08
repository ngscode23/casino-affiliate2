import dynamic from "next/dynamic";

import type { AdminStats } from "./pdp-types";

const TrustPanel = dynamic(() => import("../TrustPanel.client"), {
  ssr: false,
  loading: () => null,
});

export function PdpAdminStats({ admin }: { admin: AdminStats }) {
  return <TrustPanel isAdmin={admin.isAdmin} clicks={admin.clicks} impressions={admin.impressions} />;
}
