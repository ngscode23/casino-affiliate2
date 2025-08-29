// src/App.tsx


import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageview } from "@/lib/analytics";

// маленький компонент-слушатель
function AnalyticsRouteListener() {
  const location = useLocation();
  useEffect(() => {
    initAnalytics();
    trackPageview(location.pathname);
  }, [location.pathname]);
  return null;
}

import "./index.css";
import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import ErrorBoundary from "@/components/common/ErrorBoundary";
import Skeleton from "@/components/common/skeleton";
import OrgJsonLd from "@/components/OrgJsonLd";
import { CompareProvider } from "@/ctx/CompareContext";
import CompareBar from "@/components/layout/CompareBar";
import { ToastContainer } from "@/components/common/toast";

// ── EAGER (критичные, часто посещаемые, важны для SEO)
import HomePage from "@/pages/Home";
import ComparePage from "@/pages/Compare";

import Health from "./pages/Health";
import PageTransition from "@/components/ui/PageTransition";

// ...


// import posthog from 'posthog-js';
// src/App.tsx
import { usePageView } from "@/lib/usePageView";


// import TestButton from "./components/TestButton";

// // ...


// posthog.capture("test_click");

// posthog.capture('test_event', { foo: 'bar' });




// ── LAZY (всё остальное — чанками по требованию)
const Header              = lazy(() => import("@/components/layout/Header"));
const Footer              = lazy(() => import("@/components/layout/Footer"));
const CookieBar           = lazy(() => import("@/components/layout/CookieBar"));
const OffersIndex         = lazy(() => import("@/pages/Offers"));
const OfferPage           = lazy(() => import("@/pages/Offer"));
const FavoritesPage       = lazy(() => import("@/pages/Favorites"));
const AffiliateHome       = lazy(() => import("@/pages/AffiliateHome").then(m => ({ default: m.AffiliateHome })));

const ContactPage         = lazy(() => import("@/pages/Contact"));
const PrivacyPage         = lazy(() => import("@/pages/Legal/Privacy"));
const TermsPage           = lazy(() => import("@/pages/Legal/Terms"));
const CookiesPage         = lazy(() => import("@/pages/Legal/Cookies"));
const Responsible         = lazy(() => import("@/pages/Legal/ResponsibleGaming"));
const AffiliateDisc       = lazy(() => import("@/pages/Legal/AffiliateDisclosure"));

const RegisterPage        = lazy(() => import("@/pages/Auth/Register"));
const LoginPage           = lazy(() => import("@/pages/Auth/Login"));
const AuthCallback        = lazy(() => import("@/pages/AuthCallback"));

const GoRedirect          = lazy(() => import("@/pages/GoRedirect"));
const NotFound            = lazy(() => import("@/pages/NotFound"));

// Пример в App.tsx


// и т.д.

// ── Админка целиком в отдельном чанке
const AdminApp            = lazy(() => import("@/pages/Admin"));

// ── общий фолбэк для ленивых блоков
function PageFallback() {
  return (
    <div className="neon-container py-8 space-y-4">
      <div className="neon-card p-4 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function App() {
   usePageView();
  // Небольшой prefetch самых частых страниц при простое
  useEffect(() => {

    
    const id = (window as any).requestIdleCallback?.(() => {
      import("@/pages/Offers");
      import("@/pages/Offer");
      import("@/pages/Favorites");
    });
    return () => (window as any).cancelIdleCallback?.(id);
  }, []);


setTimeout(() => { import("@/pages/Offer"); }, 3000);
  return (
    
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text)]">
        {/* Skip link для a11y */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-black focus:text-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <CompareProvider>
          <Suspense fallback={<PageFallback />}>
            {/* Каркас и глобальная SEO-разметка */}
            <Header />
            <OrgJsonLd />
              <AnalyticsRouteListener />
              
            <main id="main" className="min-h-[60vh]">
              <Suspense fallback={<PageFallback />}>
              <PageTransition>
                <Routes>
                  {/* Публичные */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/affiliate" element={<AffiliateHome />} />
                  <Route path="/offers" element={<OffersIndex />} />
                  <Route path="/offers/:slug" element={<OfferPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />

                  {/* Маркетинг/контакты */}
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/healthz" element={<Health />} />
                  {/* Юзер-авторизация */}
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/auth/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Переадресация партнёрских ссылок */}
                  <Route path="/go/:slug" element={<GoRedirect />} />

                  {/* Legal */}
                  <Route path="/legal/privacy" element={<PrivacyPage />} />
                  <Route path="/legal/terms" element={<TermsPage />} />
                  <Route path="/legal/cookies" element={<CookiesPage />} />
                  <Route path="/legal/responsible" element={<Responsible />} />
                  <Route path="/legal/affiliate-disclosure" element={<AffiliateDisc />} />

                  {/* Админка — всё внутри своего чанка */}
                  <Route path="/admin/*" element={<AdminApp />} />

                  {/* 404 в самом конце */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            
              </Suspense>
            </main>

            <CompareBar />
            <Footer />
            <CookieBar />
            <ToastContainer />
          </Suspense>
        </CompareProvider>
      </div>
    </ErrorBoundary>
  );
}
