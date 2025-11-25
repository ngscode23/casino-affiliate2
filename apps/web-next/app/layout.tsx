import { Suspense } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";
import "../styles/vite-bridge.css";
import { SiteLayout } from "../components/site-layout";
import { siteConfig } from "../lib/site-config";
import { openAISans } from "./fonts";
export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  // базовый origin для canonical и OG
  metadataBase: new URL(process.env.NEXT_SITE_URL?.replace(/\/$/, "") || "https://example.com"),
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${openAISans.variable} font-sans antialiased bg-bg text-fg transition-colors duration-300 ease-out`}>
        <Suspense fallback={null}>
          <SiteLayout>{children}</SiteLayout>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}

