import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account | Neon Shop",
  robots: { index: false, follow: true },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
