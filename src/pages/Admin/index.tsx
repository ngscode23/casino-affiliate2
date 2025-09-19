// src/pages/Admin/index.tsx
import { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, Outlet, NavLink, useNavigate } from "react-router-dom";

//import Section from "@/components/common/section";
import Skeleton from "@/components/common/skeleton";
import UserBadge from "@/components/auth/UserBadge";
import { signOut } from "@/lib/auth";
import { LayoutDashboard, Box, Settings, Menu } from "lucide-react";

// Protect admin with admin-only guard
import { RequireAdmin as RequireAuth } from "./requireAuth";
// If you export named { RequireAuth } instead, swap the import above


const Login = lazy(() => import("./login"));
const SetupPage = lazy(() => import("./setup"));
//const ShopProducts = lazy(() => import("./shop/Products"));
const ShopProductEdit = lazy(() => import("./shop/ProductEdit"));

// Admin layout with sidebar + top header
function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const items = [
    { to: "/admin", label: "Dashboard", index: true, icon: LayoutDashboard },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/shop/products", label: "Products", icon: Box },
    { to: "/admin/setup", label: "Setup", icon: Settings },
  ];
  return (
    <div className="admin-root min-h-screen md:grid md:grid-cols-[220px_1fr] bg-bg text-text">
      {/* Sidebar */}
      {/* Mobile overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <aside
        className={
          "border-r border-border bg-card p-3 shadow-lg md:shadow-none md:static md:translate-x-0 md:block fixed z-40 inset-y-0 left-0 w-[220px] transform transition-transform duration-200 " +
          (menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
      >
        <div className="font-bold mb-3 px-2 text-text">Admin</div>
        <nav className="flex flex-col gap-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.index as any}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 border border-border transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 ${isActive ? 'bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] dark:bg-white/10 dark:text-white' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {it.icon ? <it.icon size={16} /> : null}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      {/* Main area */}
      <div className="min-h-screen flex flex-col">
        <header className="h-12 sticky top-0 z-20 border-b border-border flex items-center gap-2 px-4 bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-[rgb(var(--bg-0))]/80">
          <button className="md:hidden rounded-md border border-border p-1 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="font-semibold tracking-tight">Admin Panel</div>
          <div className="ml-auto flex items-center gap-3">
            <UserBadge />
            <button
              className="rounded-md border border-border bg-white px-2 py-1 text-sm shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20"
              onClick={async () => { await signOut(); nav("/admin/login", { replace: true }); }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
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
        {/* Public login */}
        <Route path="login" element={<Login />} />

        {/* Protected admin area */}
        <Route
          element={
            <RequireAuth>
              <AdminShell />
            </RequireAuth>
          }
        >
          {/* /admin (home) */}
          <Route index element={
            <Suspense fallback={<div className="p-6"><Skeleton className="h-6 w-32"/></div>}>
              {(() => { const Comp = lazy(() => import("@/pages/Admin/dashboard")); return <Comp/>; })()}
            </Suspense>
          } />

          {/* /admin/setup */}
          <Route path="setup" element={<SetupPage />} />

          {/* /admin/shop/products */}
          <Route path="shop/products" element={
            <Suspense fallback={<div className="p-6"><Skeleton className="h-6 w-28"/></div>}>
              {(() => { const P = lazy(() => import("@/pages/Admin/shop/products/index")); return <P/>; })()}
            </Suspense>
          } />
          <Route path="shop/products/new" element={<ShopProductEdit />} />
          <Route path="shop/products/:id" element={<ShopProductEdit />} />

          {/* /admin/orders */}
          <Route path="orders" element={
            <Suspense fallback={<div className="p-6"><Skeleton className="h-6 w-28"/></div>}>
              {(() => { const P = lazy(() => import("@/pages/Admin/orders/index")); return <P/>; })()}
            </Suspense>
          } />
        </Route>

        {/* Redirect unknown under /admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
