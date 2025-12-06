import type { ReactNode } from "react";
import type { Metadata } from "next";

import { AdminProviders } from "@/components/admin/admin-providers";
import "../../styles/vite-bridge.admin.css";
import "./admin-styles.css";

export const metadata: Metadata = {
  title: "Admin | Neon Shop",
  robots: { index: false, follow: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Force dark theme within the admin subtree regardless of global theme
  return (
    <div className="dark theme-noir min-h-screen">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}


