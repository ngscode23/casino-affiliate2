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
  // Keep admin theme consistent with admin tokens (light surface defaults).
  return (
    <div className="theme-admin min-h-screen">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}


