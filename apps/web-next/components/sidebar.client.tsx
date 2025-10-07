"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo } from "react";
import { useCart } from "@shared/ecom/lib/cart";
import { useI18n } from "@shared/lib/i18n";
import { useT } from "@shared/lib/useT";
import ThemeToggle from "@ui/components/ThemeToggle";
import LanguageSwitcher from "@ui/components/layout/LanguageSwitcher";

type NavItem = {
  href: string;
  label?: string;
  labelKey?: string;
};

type Brand = {
  name: string;
  initials: string;
  href: string;
  tagline?: string;
};

export type SidebarClientProps = {
  navItems: NavItem[];
  brand: Brand;
  tagline?: string;
};

function withLang(href: string, lang: string) {
  if (!lang || lang === "en") return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : `${path}?lang=${lang}`;
}

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency}`;
  }
}

const libraryRoutes = new Set(["/favorites", "/contact", "/partner", "/account", "/cart", "/checkout"]);

export function SidebarClient({ navItems, brand, tagline }: SidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useI18n();
  const { totalQty, subtotal } = useCart();

  const searchQuery = searchParams?.get("q") ?? "";
  const brandTagline = tagline ?? brand.tagline;

  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const cartLabel = translate("nav.cart", "Cart");
  const summaryLabel = translate("cart.summaryLabel", "Subtotal");
  const cartSummary = totalQty > 0 ? formatCurrency(subtotal || 0) : translate("cart.emptySubtotal", formatCurrency(0));
  const searchPlaceholder = translate("header.searchPlaceholder", "Search catalog");
  const goToCartLabel = translate("cart.goToCart", "Go to cart");

  const items = useMemo(() => navItems, [navItems]);
  const primaryLinks = items.filter((item) => !libraryRoutes.has(item.href));
  const libraryLinks = items.filter((item) => libraryRoutes.has(item.href));

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href === "/products") {
      return pathname === "/products" || pathname.startsWith("/products/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = (formData.get("q") as string)?.trim();
    const base = "/products";

    const target = withLang(base, lang);
    const [pathPart, queryPart = ""] = target.split("?");
    const params = new URLSearchParams(queryPart);
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `${pathPart}?${qs}` : pathPart);
  };

  const renderNavItem = (item: NavItem) => {
    const label = item.labelKey ? t(item.labelKey) : item.label ?? item.href;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={withLang(item.href, lang)}
        className={[
          "group inline-flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold tracking-tight transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          active
            ? "border-primary/50 bg-primary/15 text-primary shadow-[0_18px_52px_-36px_rgba(189,141,90,0.32)]"
            : "border-transparent text-muted hover:border-primary/30 hover:bg-card/70 hover:text-fg",
        ].join(" ")}
      >
        <span>{label}</span>
        {active ? <span className="flex h-1.5 w-1.5 rounded-full bg-primary/80" aria-hidden /> : null}
      </Link>
    );
  };

  return (
    <aside className="hidden flex-shrink-0 flex-col border-r border-border/30 bg-card/95 shadow-[0_24px_80px_-50px_rgba(153,126,92,0.35)] backdrop-blur-lg lg:flex lg:min-h-screen lg:w-[320px] lg:overflow-y-auto">
      <div className="flex flex-1 flex-col gap-8 pr-7 pl-0 py-8">
        <div>
          <Link
            href={withLang(brand.href, lang)}
            className="group flex items-center gap-3 text-base font-semibold tracking-tight text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            aria-label={brandTagline ?? brand.name}
          >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-base font-bold text-primaryfg shadow-[0_18px_44px_-24px_rgba(189,141,90,0.38)] transition-transform duration-300 group-hover:scale-105">
            {brand.initials}
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold">{brand.name}</span>
            {brandTagline ? <span className="text-xs font-medium text-muted">{brandTagline}</span> : null}
          </span>
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-muted">Search</p>
        <form onSubmit={onSearchSubmit} className="mt-3" role="search">
          <label htmlFor="sidebar-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <div className="relative">
            <input
              id="sidebar-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-xl border border-border/40 bg-card px-4 text-sm text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition placeholder:text-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 inline-flex h-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primaryfg shadow-[0_12px_30px_-20px_rgba(189,141,90,0.45)] transition hover:brightness-110"
              aria-label="Submit search"
            >
              ↵
            </button>
          </div>
        </form>
        </div>

        <div className="space-y-6 overflow-y-auto pr-1 lg:flex-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Sections</p>
            <nav className="mt-3 flex flex-col gap-1.5" aria-label="Primary navigation">
              {primaryLinks.map(renderNavItem)}
            </nav>
          </div>
          {libraryLinks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Library</p>
              <nav className="mt-3 flex flex-col gap-1.5" aria-label="Library navigation">
                {libraryLinks.map(renderNavItem)}
              </nav>
            </div>
          ) : null}
        </div>

        <div className="mt-auto space-y-5">
          <div className="rounded-2xl border border-border/40 bg-card/80 p-5 shadow-[0_24px_72px_-48px_rgba(153,126,92,0.32)]">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
              <span>{cartLabel}</span>
              <span className="rounded-full bg-primary/12 px-2 py-1 text-primary">{totalQty}</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{summaryLabel}</span>
              <span className="text-base font-semibold text-fg">{cartSummary}</span>
            </div>
            <Link
              href={withLang("/cart", lang)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primaryfg shadow-[0_18px_40px_-24px_rgba(189,141,90,0.45)] transition hover:-translate-y-[1px] hover:shadow-[0_22px_48px_-24px_rgba(189,141,90,0.52)]"
            >
              {goToCartLabel}
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/40 bg-card/70 px-4 py-3 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            + New folder
          </button>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/70 px-3 py-2">
            <LanguageSwitcher className="rounded-full bg-card px-1 py-1" />
            <ThemeToggle className="w-auto px-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default SidebarClient;
