import { AdminShell } from "@/components/admin/admin-shell";
import { AutomationClient } from "./automation-client";

export default function AutomationPage() {
  return (
    <AdminShell title="Automation Queue">
      <AutomationClient />
    </AdminShell>
  );
}
