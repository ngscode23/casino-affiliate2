"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CartProvider } from "@shared/ecom/lib/cart";
import { WishlistProvider } from "@shared/ecom/lib/wishlist";
import { I18nProvider } from "@shared/lib/i18n";
import { ToastContainer } from "@ui/components/common/toast";
import CookieBar from "@ui/components/layout/CookieBar";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = typeof pathname === "string" && pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <I18nProvider>
      <CartProvider>
        <WishlistProvider>
          <div className="flex min-h-screen flex-col">
            <Suspense fallback={null}>
              <SiteHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <ToastContainer />

            <CookieBar />
          </div>
        </WishlistProvider>
      </CartProvider>
    </I18nProvider>
  );
}
