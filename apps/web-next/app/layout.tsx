import { Suspense } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";
import "../styles/vite-bridge.css";
import { SiteLayout } from "../components/site-layout";
import { siteConfig } from "../lib/site-config";
import { openAISans } from "./fonts";
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_SITE_URL || "https://neon4.vercel.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  metadataBase: new URL(siteOrigin || "https://neon4.vercel.app"),
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
      <head>
        <meta name="google-site-verification" content="q77P5m8C_PfT6XP0AGIKYgc5agsYODZGINBVBmMSbaM" />
      </head>
      <body className={`${openAISans.variable} font-sans antialiased bg-bg text-fg transition-colors duration-300 ease-out`}>
        <Suspense fallback={null}>
          <SiteLayout>{children}</SiteLayout>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}



