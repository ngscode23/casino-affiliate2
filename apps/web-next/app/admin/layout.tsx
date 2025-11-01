import type { ReactNode } from "react";

import { AdminProviders } from "@/components/admin/admin-providers";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Force dark theme within the admin subtree regardless of global theme
  return (
    <div className="dark theme-noir min-h-screen">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}


