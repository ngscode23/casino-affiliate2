"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CartProvider } from "@shared/ecom/lib/cart";
import { WishlistProvider } from "@shared/ecom/lib/wishlist";
import { I18nProvider, useI18n } from "@shared/lib/i18n";
import type { Lang } from "@shared/lib/t";
import { ToastContainer } from "@ui/components/common/toast";
import CookieBar from "@ui/components/layout/CookieBar";
import { SiteHeader } from "./site-header";
import { Sidebar } from "./sidebar";
import { SiteFooter } from "./site-footer";

export function SiteLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (const isAdminRoute = typeof pathname === "string") { pathname.startsWith("/admin"); }

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <I18nProvider initialLang="en">
      <LangFromSearchParams />
      <CartProvider>
        <WishlistProvider>
          <div className="flex min-h-screen flex-col bg-bg text-fg">
            <div className="lg:hidden">
              <SiteHeader />
            </div>
            <div className="flex-1">
              <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 lg:px-10">
                <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
                  <div className="order-2 lg:order-1 lg:col-span-8 xl:col-span-9">
                    <main className="pb-16 lg:pb-20">{children}</main>
                    <SiteFooter />
                  </div>
                  <div className="order-1 lg:order-2 lg:col-span-4 xl:col-span-3 lg:flex lg:justify-end">
                    <Sidebar />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ToastContainer />
          <CookieBar />
        </WishlistProvider>
      </CartProvider>
    </I18nProvider>
  );
}

export default SiteLayoutClient;

function LangFromSearchParams() {
  const searchParams = useSearchParams();
  const { lang, setLang } = useI18n();
  const langParam = (searchParams?.get("lang") as Lang | null) ?? null;

  useEffect(() => {
    if (!langParam) return;
    if ((langParam === "en" || langParam === "ru") && langParam !== lang) {
      setLang(langParam);
    }
  }, [langParam, lang, setLang]);

  return null;
}
