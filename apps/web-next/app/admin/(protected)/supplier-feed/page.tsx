import { AdminInfoPanel, AdminPageLayout } from "@/components/admin/layout";

import { FeedRunsClient } from "./feed-runs-client";

export const metadata = {
  title: "Supplier Feed",
};

export default function SupplierFeedPage() {
  return (
    <AdminPageLayout
      title="Supplier Feed"
      description="View supplier feed runs and trigger imports."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Supplier Feed" },
      ]}
      sidebar={
        <AdminInfoPanel title="How it works">
          <p>Each import creates a feed run with stats and errors.</p>
          <p>Upload CSV/JSON, set miss_threshold to control auto-disable.</p>
        </AdminInfoPanel>
      }
    >
      <FeedRunsClient />
    </AdminPageLayout>
  );
}
