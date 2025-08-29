// src/pages/Admin/index.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Link, Outlet } from "react-router-dom";

import Section from "@/components/common/section";
import Skeleton from "@/components/common/skeleton";

// Если в requireAuth.tsx экспорт по умолчанию:
import { RequireAuth } from "./requireAuth";
// Если у тебя там именованный экспорт { RequireAuth }, то строку выше замени на:
// import { RequireAuth } from "./requireAuth";

const Login = lazy(() => import("./login"));
const OffersList = lazy(() => import("./offers/List"));
const OffersEdit = lazy(() => import("./offers/Edit"));

/** Оболочка админки с Outlet для вложенных роутов */
function AdminShell() {
  return (
    <div className="admin-layout">
      {/* здесь можно держать боковое меню админки */}
      <Outlet />
    </div>
  );
}

export default function AdminApp() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-6 w-40" />
        </div>
      }
    >
      <Routes>
        {/* Страница логина */}
        <Route path="login" element={<Login />} />

        {/* Защищённый блок админки */}
        <Route
          element={
            <RequireAuth>
              <AdminShell />
            </RequireAuth>
          }
        >
          {/* /admin (главная админки) */}
          <Route
            index
            element={
              <Section className="p-6 space-y-3">
                <h1 className="text-2xl font-bold">Admin</h1>
                <div className="space-x-3">
                  <Link className="underline" to="offers">
                    Offers
                  </Link>
                  <Link className="underline" to="offers/new">
                    New Offer
                  </Link>
                </div>
              </Section>
            }
          />

          {/* /admin/offers */}
          <Route path="offers" element={<OffersList />} />

          {/* /admin/offers/new */}
          <Route path="offers/new" element={<OffersEdit />} />

          {/* /admin/offers/:slug */}
          <Route path="offers/:slug" element={<OffersEdit />} />
        </Route>

        {/* Редирект на /admin для любых неизвестных путей */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}