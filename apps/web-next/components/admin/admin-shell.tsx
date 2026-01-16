"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/common/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings2,
  ChartColumn,
  Megaphone,
  MessageSquare,
  PlusCircle,
  Menu,
  Tags,
  Package2,
  Building2,
  Truck,
  Link2,
  History,
  ClipboardList,
} from "lucide-react";

import { AdminProviders } from "./admin-providers";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  match?: "exact" | "starts";
};

type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: "exact" }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/catalog/categories", label: "Categories", icon: Tags },
      { href: "/admin/catalog/brands", label: "Brands", icon: Building2 },
      { href: "/admin/catalog/products", label: "Models", icon: Package2 },
    ],
  },
  {
    title: "Shop",
    items: [
      { href: "/admin/shop/products", label: "SKU", icon: Package },
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { href: "/admin/supplier-skus", label: "Supplier SKUs", icon: Link2 },
      { href: "/admin/supplier-offers", label: "Supplier Offers", icon: Package },
      { href: "/admin/supplier-inventory", label: "Supplier Inventory", icon: ClipboardList },
      { href: "/admin/supplier-feed", label: "Feed runs", icon: History },
      { href: "/admin/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { href: "/admin/shipments", label: "Shipments", icon: Truck },
      { href: "/admin/rma-requests", label: "RMA", icon: MessageSquare },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
      { href: "/admin/reports", label: "Reports", icon: ChartColumn },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/dropship-health", label: "Dropship Health", icon: ClipboardList },
      { href: "/admin/logs", label: "Logs", icon: MessageSquare },
      { href: "/admin/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

const APP_ENVIRONMENT =
  process.env.NEXT_PUBLIC_APP_ENVIRONMENT ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <AdminProviders>
      <div className="theme-admin relative flex min-h-screen bg-[#f5f6f8]">
        {open ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-40 w-[256px] border-r border-admin-border bg-admin-surface px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-transform duration-200 md:translate-x-0 md:block",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-8 px-px text-xs font-semibold uppercase tracking-[0.32em] text-admin-textSubtle">
            Admin Console
          </div>
          <nav className="flex flex-col gap-8">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-admin-textSubtle">
                  {group.title}
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.match === "exact"
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                          isActive
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-admin-textSoft hover:bg-admin-surfaceMuted hover:text-admin-text",
                        )}
                      >
                        <Icon
                          size={18}
                          className={clsx(
                            "transition-colors duration-150",
                            isActive ? "text-indigo-600" : "text-admin-textSubtle group-hover:text-admin-textSoft",
                          )}
                        />
                        <span className="pl-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col md:ml-[256px]">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-admin-border bg-admin-surface/95 px-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text transition hover:bg-admin-surfaceMuted hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30 md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-admin-textSubtle">Admin</span>
              <EnvironmentBadge />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <QuickAddMenu />
            </div>
          </header>

          <main className="flex-1 bg-transparent px-4 py-8 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </AdminProviders>
  );
}

function QuickAddMenu() {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 text-sm font-semibold text-admin-text transition hover:bg-admin-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30"
        >
          <PlusCircle size={18} />
          Быстрое создание
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="text-black">Создать</DropdownMenuLabel>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/shop/products/new")}>
          Новый SKU (витрина)
        </DropdownMenuItem>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/catalog/brands")}>
          Новый бренд каталога
        </DropdownMenuItem>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/catalog/products")}>
          Новая модель каталога
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/marketing/discounts/new")}>
          Акция / промокод
        </DropdownMenuItem>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/orders/new")}>
          Заказ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/customers/new")}>
          Клиент
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EnvironmentBadge() {
  const env = (APP_ENVIRONMENT || "").toLowerCase();
  const isProd = env === "production";
  const isStaging = env === "staging";
  const label = isProd ? "Prod" : isStaging ? "Staging" : env ? env : "Dev";

  return (
    <span
      className={clsx(
        "hidden items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] sm:inline-flex",
        isProd
          ? "bg-red-100 text-red-700 border border-red-200"
          : isStaging
            ? "bg-amber-100 text-amber-700 border border-amber-200"
            : "bg-emerald-100 text-emerald-700 border border-emerald-200",
      )}
    >
      {label}
    </span>
  );
}
