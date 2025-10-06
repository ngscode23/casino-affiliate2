import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { SiteLayout } from "../components/site-layout";
import { siteConfig } from "../lib/site-config";
import { openAISans } from "./fonts";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  metadataBase: new URL("https://neonshop.dev"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${openAISans.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <SiteLayout>{children}</SiteLayout>
        </Suspense>
      </body>
    </html>
  );
}
