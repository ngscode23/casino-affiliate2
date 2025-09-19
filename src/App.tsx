// src/App.tsx
import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import "./index.css";

// Core providers
import { I18nProvider } from "@/lib/i18n";
import { VerticalProvider } from "@/ctx/VerticalContext";
import { CompareProvider } from "@/ctx/CompareContext";
import { CartProvider } from "@/ecom/lib/cart";
import { WishlistProvider } from "@/ecom/lib/wishlist";

// Shell & common
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { ensureSession } from "@/lib/auth";
import { ToastContainer } from "@/components/common/toast";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/common/skeleton";
import OrgJsonLd from "@/components/OrgJsonLd";
// import CompareBar from "@/components/layout/CompareBar";
import { AgeGate } from "@/components/AgeGate";
//import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Eager pages (самые посещаемые/SEO-критичные)
import HomePage from "@/pages/Home";
// import ComparePage from "@/pages/Compare";
import Health from "@/pages/Health";

// Analytics
import { trackPageview } from "@/lib/analytics";
import { usePageView } from "@/lib/usePageView";

// Lazy layout
const Header            = lazy(() => import("@/components/layout/Header"));
const Footer            = lazy(() => import("@/components/layout/Footer"));
const CookieBar         = lazy(() => import("@/components/layout/CookieBar"));
const AnalyticsGateGA   = lazy(() => import("@/components/AnalyticsGateGA"));

// Lazy regular pages
// const OffersIndex       = lazy(() => import("@/pages/Offers"));
// const OfferPage         = lazy(() => import("@/pages/Offer"));
// const FavoritesPage     = lazy(() => import("@/pages/Favorites"));
// const AffiliateHome     = lazy(() => import("@/pages/AffiliateHome").then(m => ({ default: m.AffiliateHome })));
// const HowWeRankPage     = lazy(() => import("@/pages/HowWeRank"));
const ContactPage       = lazy(() => import("@/pages/Contact"));
const PrivacyPage       = lazy(() => import("@/pages/Legal/Privacy"));
const TermsPage         = lazy(() => import("@/pages/Legal/Terms"));
const CookiesPage       = lazy(() => import("@/pages/Legal/Cookies"));
//const Responsible       = lazy(() => import("@/pages/Legal/ResponsibleGaming"));
const AffiliateDisc     = lazy(() => import("@/pages/Legal/AffiliateDisclosure"));
const RegisterPage      = lazy(() => import("@/pages/Auth/Register"));
const LoginPage         = lazy(() => import("@/pages/Auth/Login"));
const AuthCallback      = lazy(() => import("@/pages/AuthCallback"));
const ResetPassword     = lazy(() => import("@/pages/Auth/ResetPassword"));
const GoRedirect        = lazy(() => import("@/pages/GoRedirect"));
const NotFound          = lazy(() => import("@/pages/NotFound"));
// const PricingPage       = lazy(() => import("@/pages/Pricing"));
// const PartnerPortalPage = lazy(() => import("@/pages/Partner"));

// Lazy e-commerce
const ShopHome          = lazy(() => import("@/ecom/pages/Home"));
const CatalogPage       = lazy(() => import("@/ecom/pages/Catalog"));
const ProductPage       = lazy(() => import("@/ecom/pages/Product"));
const CartPage          = lazy(() => import("@/ecom/pages/Cart"));
const CheckoutPage      = lazy(() => import("@/ecom/pages/Checkout"));
const WishlistPage      = lazy(() => import("@/ecom/pages/Wishlist"));
const AccountOrdersPage = lazy(() => import("@/pages/Account/Orders"));

// Lazy admin (весь бандл отдельно)
const AdminApp          = lazy(() => import("@/pages/Admin"));

// Route analytics small helper
function AnalyticsRouteListener() {
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname);
  }, [location.pathname]);
  return null;
}

// Suspense fallback
function PageFallback() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function App() {
  usePageView();

  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, []);

  const FEATURE_AGE_GATE = (import.meta as any).env?.VITE_FEATURE_AGE_GATE === "true";
  const [ageAccepted, setAgeAccepted] = useState<boolean>(true);

  // Restore age gate
  useEffect(() => {
    if (!FEATURE_AGE_GATE) return;
    try {
      setAgeAccepted(localStorage.getItem("age:accepted") === "1");
    } catch {
      /* noop */
    }
  }, [FEATURE_AGE_GATE]);

  const acceptAge = () => {
    try {
      localStorage.setItem("age:accepted", "1");
    } catch {
      /* noop */
    }
    setAgeAccepted(true);
  };

// type IdleCallback = (deadline?: IdleDeadline) => void;

// declare global IdleDeadline если надо:
// interface IdleDeadline {
//   didTimeout: boolean;
//   timeRemaining: () => number;
// }




  // Prefetch популярных страниц в idle
  // Prefetch of casino-related pages removed

  // Доп. ленивый прогрев конкретной страницы через пару секунд
  // Background prefetch removed

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text)]">
        {FEATURE_AGE_GATE && !ageAccepted ? <AgeGate onAccept={acceptAge} /> : null}

        {/* a11y: skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-black focus:text-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <I18nProvider>
          <VerticalProvider>
            <CompareProvider>
              <CartProvider>
                <WishlistProvider>
                  <Suspense fallback={<PageFallback />}>
                    <Header />
                    <OrgJsonLd />
                    <AnalyticsRouteListener />

                    <main id="main" className="min-h-[60vh]">
                      <Suspense fallback={<PageFallback />}>
                        <PageTransition>
                          <Routes>
                            {/* Public */}
                            <Route path="/" element={<HomePage />} />
                            {/* Compare disabled */}
                            <Route path="/healthz" element={<Health />} />

                            {/* E-commerce */}
                            <Route path="/shop" element={<ShopHome />} />
                            <Route path="/catalog" element={<CatalogPage />} />
                            <Route path="/product/:slug" element={<ProductPage />} />
                            <Route path="/cart" element={<CartPage />} />
                            <Route path="/wishlist" element={<WishlistPage />} />
                          <Route path="/checkout" element={<CheckoutPage />} />

                          {/* Account */}
                          <Route path="/account/orders" element={<AccountOrdersPage />} />

                            {/* Marketing disabled */}
                            <Route path="/contact" element={<ContactPage />} />

                            {/* Auth */}
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/auth/login" element={<LoginPage />} />
                            <Route path="/auth/reset" element={<ResetPassword />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />

                            {/* Redirects */}
                            <Route path="/go/:slug" element={<GoRedirect />} />

                            {/* Legal */}
                            <Route path="/legal/privacy" element={<PrivacyPage />} />
                            <Route path="/legal/terms" element={<TermsPage />} />
                            <Route path="/legal/cookies" element={<CookiesPage />} />
                            {/* Responsible gaming page hidden */}
                            <Route path="/legal/affiliate-disclosure" element={<AffiliateDisc />} />

                            {/* Partner portal disabled */}

                            {/* Admin as isolated chunk */}
                          <Route path="/admin/*" element={<AdminApp />} />

                            {/* 404 */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </PageTransition>
                      </Suspense>
                    </main>

                    {/* CompareBar hidden */}
                    <Footer />
                    <CookieBar />
                    <AnalyticsGateGA />
                    <ToastContainer />
                  </Suspense>
                </WishlistProvider>
              </CartProvider>
            </CompareProvider>
          </VerticalProvider>
        </I18nProvider>
      </div>
    </ErrorBoundary>
  );
}
