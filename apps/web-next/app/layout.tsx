import { Suspense } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";
import "../styles/vite-bridge.css";
import { SiteLayout } from "../components/site-layout";
import GtmProvider from "../components/analytics/GtmProvider";
import { siteConfig } from "../lib/site-config";
import { getSiteOrigin } from "../lib/env/siteUrl";
import { openAISans } from "./fonts";
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  metadataBase: new URL(getSiteOrigin()),
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
        {gtmId ? (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        ) : null}
        <GtmProvider gtmId={gtmId} ga4Id={ga4Id}>
          <Suspense fallback={null}>
            <SiteLayout>{children}</SiteLayout>
          </Suspense>
        </GtmProvider>
        <Analytics />
      </body>
    </html>
  );
}



