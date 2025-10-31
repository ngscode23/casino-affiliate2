"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Settings,
  Menu,
  Plus,
  BarChart3,
  Users,
  Webhook,
  ScrollText,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

import UserBadge from "./user-badge";
import { signOut } from "@shared/lib/auth";
import clsx from "clsx";
import { fetchPendingReviews } from "@/lib/admin/reviews";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: "exact" as const },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/metrics", label: "Metrics", icon: TrendingUp },
  { href: "/admin/offers", label: "Offers", icon: ScrollText },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/partners", label: "Partners", icon: Users },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/shop/products", label: "Products", icon: Box },
  { href: "/admin/setup", label: "Setup", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
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

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="admin-root min-h-screen md:grid md:grid-cols-[220px_1fr] bg-bg text-white/90">
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <aside
        className={clsx(
          "border-r border-border bg-card p-3 shadow-lg md:shadow-none md:static md:translate-x-0 md:block fixed z-40 inset-y-0 left-0 w-[220px] transform transition-transform duration-200",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-3 px-2 font-bold text-text">Admin</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.match ?? "starts");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-accent-20) dark:border-white/10",
                  active && "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] dark:bg-white/10 dark:text-white",
                )}
              >
                {Icon ? <Icon size={16} /> : null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-[rgb(var(--bg-0))]/80 px-4 backdrop-blur">
          <button
            className="rounded-md border border-border p-1 shadow-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-accent-20) md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="font-semibold tracking-tight text-white">Admin Panel</div>
          <div className="ml-auto flex items-center gap-3">
            <PendingReviewsButton />
            <button
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white/10 px-2 py-1 text-sm text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-accent-20)"
              onClick={() => router.push("/admin/shop/products/new")}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add product</span>
            </button>
            <UserBadge />
            <button
              className="rounded-md border border-border bg-white/10 px-2 py-1 text-sm text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-accent-20)"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 bg-bg">{children}</main>
      </div>
    </div>
  );
}

function PendingReviewsButton() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(async () => {
    setLoading(true);
    try {
      const { total } = await fetchPendingReviews(1);
      setCount(total);
    } catch {
      // ignore errors, badge will stay hidden
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCount();
    const timer = window.setInterval(() => {
      void loadCount();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadCount]);

  const badge = count != null && count > 0 ? (count > 99 ? "99+" : String(count)) : null;

  return (
    <button
      type="button"
      className="relative inline-flex h-9 items-center justify-center rounded-md border border-border bg-white/10 px-2 text-sm text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-accent-20)"
      onClick={() => router.push("/admin#pending-reviews")}
      title="View pending reviews"
      aria-label="View pending reviews"
    >
      <MessageSquare size={16} />
      {!loading && badge ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[rgb(var(--primary))] px-1 text-[10px] font-semibold leading-4 text-white shadow">
          {badge}
        </span>
      ) : null}
    </button>
  );
}





