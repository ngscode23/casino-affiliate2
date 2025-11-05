"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Users,
  Megaphone,
  NotebookText,
  BarChart3,
  Plug,
  Settings2,
  ClipboardList,
  Menu,
  Plus,
  PlusCircle,
  Bell,
  Search,
  MessageSquare,
} from "lucide-react";

import { getUser, signOut, ensureSession } from "@shared/lib/auth";
import clsx from "clsx";
import { fetchPendingReviews } from "@/lib/admin/reviews";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/common/dropdown-menu";

type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  match?: "exact" | "starts";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Обзор",
    items: [{ href: "/admin", label: "Дашборд", icon: LayoutDashboard, match: "exact" }],
  },
  {
    title: "Операции",
    items: [
      { href: "/admin/shop/products", label: "Товары", icon: PackageSearch },
      { href: "/admin/orders", label: "Заказы", icon: ShoppingCart },
      { href: "/admin/customers", label: "Клиенты", icon: Users },
    ],
  },
  {
    title: "Развитие",
    items: [
      { href: "/admin/marketing", label: "Маркетинг", icon: Megaphone },
      { href: "/admin/cms", label: "Контент", icon: NotebookText },
      { href: "/admin/reports", label: "Отчёты", icon: BarChart3 },
    ],
  },
  {
    title: "Инфраструктура",
    items: [
      { href: "/admin/integrations", label: "Интеграции", icon: Plug },
      { href: "/admin/settings", label: "Настройки", icon: Settings2 },
      { href: "/admin/logs", label: "Логи / аудит", icon: ClipboardList },
    ],
  },
];

const APP_ENVIRONMENT =
  (process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    "production") || "production";
const ENVIRONMENT_LABEL =
  APP_ENVIRONMENT.toLowerCase() === "production"
    ? "Prod"
    : APP_ENVIRONMENT.toLowerCase() === "staging"
      ? "Staging"
      : APP_ENVIRONMENT.toLowerCase() === "development"
        ? "Dev"
        : APP_ENVIRONMENT;

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    ensureSession().catch((error) => {
      console.error("[admin-shell] ensureSession failed", error);
    });
  }, []);


  const navSections = useMemo(() => NAV_SECTIONS, []);

  const isActive = (href: string, match: "exact" | "starts" = "starts") => {
    if (!pathname) return false;
    if (match === "exact") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error("[admin-shell] signOut failed", error);
    } finally {
      router.replace("/admin/login");
    }
  }

  return (
    <div className={clsx("theme-admin relative flex min-h-screen bg-[#f5f6f8]", menuOpen ? "overflow-hidden md:overflow-visible" : undefined)}>
      {menuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[256px] border-r border-admin-border bg-admin-surface px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-transform duration-200 md:block",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-8 px-px text-xs font-semibold uppercase tracking-[0.32em] text-admin-textSubtle">
          Admin Console
        </div>
        <nav className="flex flex-col gap-8">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-admin-textSubtle">
                {section.title}
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {section.items.map((item) => {
                  const active = isActive(item.href, item.match ?? "starts");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={clsx(
                        "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                        active
                          ? "bg-indigo-100 text-indigo-700 shadow-none"
                          : "text-admin-textSoft hover:bg-admin-surfaceMuted hover:text-admin-text",
                      )}
                    >
                      {Icon ? (
                        <Icon
                          size={18}
                          className={clsx(
                            "transition-colors duration-150",
                            active
                              ? "text-indigo-600"
                              : "text-admin-textSubtle group-hover:text-admin-textSoft",
                          )}
                        />
                      ) : null}
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text transition hover:bg-admin-surfaceMuted hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <GlobalSearch />
          <div className="hidden items-center gap-2 md:flex">
            <QuickAddMenu />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <EnvironmentBadge />
            <PendingReviewsButton />
            <NotificationsButton />
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl bg-admin-primary px-4 text-sm font-semibold text-admin-primary-foreground shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/50"
              onClick={() => router.push("/admin/shop/products/new")}
            >
              <Plus size={16} className="mr-2" />
              Новый товар
            </button>
            <AdminUserMenu onSignOut={handleSignOut} />
          </div>
        </header>
        <main
          key={pathname ?? "admin-root"}
          className="flex-1 bg-transparent px-4 py-8 sm:px-6 lg:px-10 animate-page-fade"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function PendingReviewsButton() {
  const router = useRouter();

  useEffect(() => {
    ensureSession().catch(() => undefined);
  }, []);

  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(async () => {
    setLoading(true);
    try {
      const { total } = await fetchPendingReviews(1);
      setCount(total);
    } catch (error) {
      console.error("[admin-shell] fetchPendingReviews failed", error);
      // badge stays hidden
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
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text transition hover:bg-admin-surfaceMuted hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30"
      onClick={() => router.push("/admin#pending-reviews")}
      title="View pending reviews"
      aria-label="View pending reviews"
    >
      <MessageSquare size={17} />
      {!loading && badge ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-4 text-white shadow">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AdminUserMenu({ onSignOut }: { onSignOut: () => Promise<void> | void }) {
  const [label, setLabel] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

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
        const collected = new Set<string>();
        const primaryRole = normalizeRole(user?.role);
        if (primaryRole) collected.add(primaryRole);
        for (const role of extractRolesFromMetadata(user?.metadata)) {
          collected.add(role);
        }
        if (!collected.size) {
          collected.add("admin");
        }
        setRoles(Array.from(collected));
      } catch (error) {
        console.error("[admin-shell] getUser failed", error);
        if (!active) return;
        setLabel("admin");
        setInitials("AD");
        setRoles(["admin"]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-xl border border-admin-border bg-admin-surface px-2 py-1 pr-4 text-sm font-medium text-admin-text transition hover:bg-admin-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-primary text-sm font-semibold uppercase text-admin-primary-foreground">
            {initials ?? "AD"}
          </span>
          <span className="hidden sm:inline">{label ?? "admin"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-admin-text">{label ?? "admin"}</span>
            <span className="text-xs text-admin-textSubtle">Роли</span>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center rounded-full bg-admin-surfaceSubtle px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-admin-textSoft"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSignOut()}>
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      router.push(`/admin/search?q=${encodeURIComponent(trimmed)}`);
    },
    [query, router],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden flex-1 items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text shadow-sm transition focus-within:border-admin-primary focus-within:ring-2 focus-within:ring-admin-primary/20 md:flex"
      role="search"
      aria-label="Глобальный поиск"
    >
      <Search size={16} className="text-admin-textSubtle" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск: SKU, заказ, клиент..."
        className="h-6 flex-1 bg-transparent text-sm text-admin-text placeholder:text-admin-textSubtle focus:outline-none"
      />
    </form>
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
          Быстро добавить
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="text-black">Создать</DropdownMenuLabel>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/products/new")}>
          Товар
        </DropdownMenuItem>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/marketing/discounts/new")}>
          Скидку/промокод
        </DropdownMenuItem>
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/orders/new")}>
          Заказ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-black" onClick={() => router.push("/admin/customers/new")}>
          Клиента
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EnvironmentBadge() {
  const isProd = APP_ENVIRONMENT.toLowerCase() === "production";
  const isStaging = APP_ENVIRONMENT.toLowerCase() === "staging";
  const badgeClass = isProd
    ? "bg-red-100 text-red-600 border border-red-200"
    : isStaging
      ? "bg-amber-100 text-amber-700 border border-amber-200"
      : "bg-emerald-100 text-emerald-700 border border-emerald-200";

  return (
    <span className={clsx("hidden items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] sm:inline-flex", badgeClass)}>
      {ENVIRONMENT_LABEL}
    </span>
  );
}

function NotificationsButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text transition hover:bg-admin-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30"
      onClick={() => router.push("/admin/notifications")}
      aria-label="Открыть уведомления"
    >
      <Bell size={18} />
    </button>
  );
}

function normalizeRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized : null;
}

function extractRolesFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  const collected: string[] = [];

  const directRole = normalizeRole(typeof record.role === "string" ? record.role : null);
  if (directRole) collected.push(directRole);

  const rawRoles = record.roles;
  if (Array.isArray(rawRoles)) {
    for (const candidate of rawRoles) {
      const normalized = normalizeRole(typeof candidate === "string" ? candidate : null);
      if (normalized) collected.push(normalized);
    }
  } else if (typeof rawRoles === "string") {
    try {
      const parsed = JSON.parse(rawRoles);
      if (Array.isArray(parsed)) {
        for (const candidate of parsed) {
          const normalized = normalizeRole(candidate);
          if (normalized) collected.push(normalized);
        }
      } else {
        const normalized = normalizeRole(rawRoles);
        if (normalized) collected.push(normalized);
      }
    } catch {
      const normalized = normalizeRole(rawRoles);
      if (normalized) collected.push(normalized);
    }
  }

  return collected;
}









