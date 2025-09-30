import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteLayout } from "../components/site-layout";
import { siteConfig } from "../lib/site-config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
      <body className={`${inter.variable} font-sans antialiased`}>
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
