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

import { getUser, signOut } from "@shared/lib/auth";
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
    <div className="relative min-h-screen overflow-hidden bg-[#080b10] text-slate-200">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-[-20%] -z-10 hidden w-[50%] bg-[radial-gradient(circle_at_center,rgba(244,0,131,0.16),transparent_60%)] lg:block" />
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-[240px] border-r border-white/5 bg-[#0b0f16]/95 px-5 py-6 shadow-[0_20px_40px_rgba(3,7,18,0.55)] backdrop-blur transition-transform duration-200 md:block",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-6 px-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Admin Panel</div>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.match ?? "starts");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-2xl px-8 py-3 text-sm font-medium tracking-wide text-slate-400 transition duration-200",
                  active
                    ? "bg-white/10 text-white shadow-[0_18px_35px_rgba(17,85,240,0.22)]"
                    : "hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={clsx(
                    "absolute left-4 h-8 w-1 rounded-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] opacity-0 transition-opacity duration-200",
                    active ? "opacity-100" : "group-hover:opacity-70",
                  )}
                  aria-hidden
                />
                {Icon ? <Icon size={18} className="text-slate-300" /> : null}
                <span className="pl-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-col md:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#080b10]/80 px-5 backdrop-blur-xl">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="text-lg font-semibold tracking-tight text-white">Admin Panel</div>
          <div className="ml-auto flex items-center gap-3">
            <PendingReviewsButton />
            <button
              className="hidden h-10 items-center justify-center rounded-full bg-[#f40083] px-5 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_12px_30px_rgba(244,0,131,0.35)] transition hover:shadow-[0_16px_35px_rgba(244,0,131,0.5)] sm:inline-flex"
              onClick={() => router.push("/admin/shop/products/new")}
            >
              <Plus size={16} className="mr-1" />
              Add product
            </button>
            <AdminUserPill />
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 bg-transparent px-4 py-6 sm:px-6 lg:px-10">{children}</main>
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
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 shadow-[0_12px_24px_rgba(8,12,32,0.45)] transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      onClick={() => router.push("/admin#pending-reviews")}
      title="View pending reviews"
      aria-label="View pending reviews"
    >
      <MessageSquare size={17} />
      {!loading && badge ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold leading-4 text-white shadow">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AdminUserPill() {
  const [label, setLabel] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getUser();
        if (!active) return;
        const email = user?.email ?? "";
        const display = email || "admin";
        setLabel(display);
        const basis = (user?.metadata?.name as string | undefined)?.trim() || email.split("@")[0] || "AD";
        const letters = basis
          .split(/[\s._-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0] ?? "")
          .join("")
          .toUpperCase();
        setInitials(letters || "AD");
      } catch {
        if (!active) return;
        setLabel("admin");
        setInitials("AD");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1 pr-4 text-xs text-slate-200 shadow-[0_14px_30px_rgba(8,12,32,0.45)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1f2a40] to-[#0f1729] text-sm font-semibold uppercase text-white">
        {initials ?? "AD"}
      </span>
      <span className="hidden text-sm font-medium text-slate-100 sm:inline">{label ?? "admin"}</span>
    </div>
  );
}





