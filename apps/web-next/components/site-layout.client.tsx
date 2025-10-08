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
import { Sidebar } from "./sidebar";

export function SiteLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    typeof pathname === "string" && pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <I18nProvider initialLang="en">
      <LangFromSearchParams />
      <CartProvider>
        <WishlistProvider>
          <div className="flex min-h-screen bg-bg text-fg">
            <Sidebar />
            <div className="flex w-full flex-1 flex-col overflow-hidden">
              <div className="flex-1">
                <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
                  <main className="pb-16 lg:pb-20">{children}</main>
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
