"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Menu,
  LogOut,
  Store,
  Plus,
} from "lucide-react";
import clsx from "clsx";

import ThemeToggle from "@ui/components/ThemeToggle";
import { signOut } from "@shared/lib/auth";

export type SellerShellProps = {
  seller: {
    id: string;
    display_name: string;
    slug: string | null;
    status: string;
    contact_email: string | null;
  };
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/seller", label: "Дашборд", icon: LayoutDashboard, match: "exact" as const },
  { href: "/seller/products", label: "Мои товары", icon: Package },
  { href: "/seller/orders", label: "Заказы", icon: ShoppingCart },
];

export function SellerShell({ seller, children }: SellerShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = useMemo(() => NAV_ITEMS, []);

  const isActive = (href: string, match: "exact" | "starts" = "starts") => {
    if (!pathname) return false;
    if (match === "exact") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function handleLogout() {
    await signOut();
    router.replace("/login?next=/seller");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white md:grid md:grid-cols-[240px_1fr]">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[240px] transform border-r border-white/10 bg-neutral-900/95 p-4 shadow-xl transition-transform duration-200 md:static md:translate-x-0 md:bg-neutral-900/80 md:shadow-none",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-white/70">
            <Store size={18} /> Продавец
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-2 py-1 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white/90 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            Закрыть
          </button>
        </div>
        <div className="mt-4 space-y-1">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <div className="font-semibold text-white">{seller.display_name}</div>
            <div className="mt-1 truncate text-[11px] uppercase tracking-widest text-white/40">
              {seller.status === "active" ? "Аккаунт активен" : `Статус: ${seller.status}`}
            </div>
            {seller.slug ? (
              <div className="mt-1 text-[11px] text-white/50">/{seller.slug}</div>
            ) : null}
          </div>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.match ?? "starts");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:border-white/25 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  active && "border-white/30 bg-white/10 text-white",
                )}
              >
                {Icon ? <Icon size={16} /> : null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col bg-gradient-to-br from-neutral-950 via-neutral-930 to-neutral-900">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-neutral-950/80 px-4 backdrop-blur">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 p-2 text-white/70 transition hover:border-white/30 hover:text-white md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={18} />
          </button>
          <div className="text-sm font-semibold tracking-wide text-white/80">Кабинет продавца</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/20 md:inline-flex"
              onClick={() => router.push("/seller/products/new")}
            >
              <Plus size={14} /> Новый товар
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm font-medium text-white/70 transition hover:border-white/30 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:px-5 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  );
}

