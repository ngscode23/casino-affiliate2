"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { CartProvider } from "@shared/ecom/lib/cart";
import { WishlistProvider } from "@shared/ecom/lib/wishlist";
import { I18nProvider, useI18n } from "@shared/lib/i18n";
import type { Lang } from "@shared/lib/t";
import { ToastContainer } from "@ui/components/common/toast";
import CookieBar from "@ui/components/layout/CookieBar";
import { Sidebar } from "./sidebar";
import { ensureUtmContext } from "@shared/lib/utm";
import { Sheet, SheetContent, SheetTrigger } from "@ui/components/common/sheet";
import { ensureSession } from "@shared/lib/auth";
import { CompareProvider } from "@shared/ctx/CompareContext";
import { SiteFooter } from "./site-footer";

export function SiteLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    typeof pathname === "string" && pathname.startsWith("/admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="relative flex min-h-screen bg-bg text-fg">
            <Sidebar />
            <div className="relative z-0 flex w-full flex-1 flex-col overflow-hidden">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <div className="sticky top-0 z-40 border-b border-border/50 bg-bg/95 px-4 py-3 backdrop-blur min-[923px]:hidden">
                  <div className="mx-auto flex w-full max-w-screen-xl justify-start">
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        aria-label="Открыть меню каталога"
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        <Menu className="h-4 w-4" aria-hidden />
                        <span>Каталог</span>
                      </button>
                    </SheetTrigger>
                  </div>
                </div>
                <SheetContent
                  side="left"
                  className="w-[92vw] max-w-[360px] gap-0 border-r border-border/60 bg-card/95 p-0 text-fg"
                  hiddenTitle="Навигация по каталогу"
                >
                  <Sidebar variant="drawer" onNavigate={() => setSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="flex-1">
                <div className="mx-auto w-full max-w-screen-xl px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
                  <main className="pb-16 lg:pb-20 animate-page-fade">{children}</main>
                  <SiteFooter />
                </div>
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
