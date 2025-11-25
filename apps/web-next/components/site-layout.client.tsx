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
import { ensureUtmContext } from "@shared/lib/utm";
import { ensureSession } from "@shared/lib/auth";
import { CompareProvider } from "@shared/ctx/CompareContext";
import { SiteFooter } from "./site-footer";
import { SiteHeader, type NavItem } from "./site-header";

type HeaderCategorySummary = {
  slug: string;
  title: string;
  description: string | null;
};

type SiteLayoutClientProps = {
  children: ReactNode;
  navItems: NavItem[];
  catalogCategories: HeaderCategorySummary[];
};

export function SiteLayoutClient({ children, navItems, catalogCategories }: SiteLayoutClientProps) {
  const pathname = usePathname();
  const isAdminRoute = typeof pathname === "string" && pathname.startsWith("/admin");

  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, []);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <I18nProvider initialLang="en">
      <CompareProvider>
        <UtmBootstrap />
        <LangFromSearchParams />
        <CartProvider>
          <WishlistProvider>
            <div className="flex min-h-screen flex-col bg-bg text-fg">
              <SiteHeader navItems={navItems} catalogCategories={catalogCategories} />
              <div className="flex-1">
                <div className="mx-auto w-full max-w-screen-xl px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
                  <main key={pathname ?? "site-root"} className="pb-16 lg:pb-20 animate-page-fade">
                    {children}
                  </main>
                  <SiteFooter />
                </div>
              </div>
            </div>
            <ToastContainer />
            <CookieBar />
          </WishlistProvider>
        </CartProvider>
      </CompareProvider>
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

function UtmBootstrap() {
  useEffect(() => {
    try {
      ensureUtmContext();
    } catch {
      // ignore
    }
  }, []);
  return null;
}
