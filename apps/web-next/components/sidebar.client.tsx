"use client";

import Link from "next/link";
import { useMemo, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@shared/ecom/lib/cart";
import { useI18n } from "@shared/lib/i18n";
import { useT } from "@shared/lib/useT";
import { cn } from "@shared/lib/cn";
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
  className?: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
};

function withLang(href: string, lang: string) {
  if (!lang || lang === "en") return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : `${path}?lang=${lang}`;
}

function formatCurrency(value: number, currency = "USD", locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency}`;
  }
}

const libraryRoutes = new Set(["/favorites", "/contact", "/partner", "/account", "/account/reviews", "/cart", "/checkout"]);

export function SidebarClient({
  navItems,
  brand,
  tagline,
  className,
  onNavigate,
  variant = "sidebar",
}: SidebarClientProps) {
  const { lang } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { totalQty, subtotal } = useCart();

  const searchQuery = searchParams?.get("q") ?? "";
  const items = useMemo(() => navItems, [navItems]);
  const brandTagline = tagline ?? brand.tagline;

  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const cartLabel = translate("nav.cart", "Cart");
  const summaryLabel = translate("cart.summaryLabel", "Subtotal");
  const searchPlaceholder = translate("header.searchPlaceholder", "Search products");
  const goToCartLabel = translate("cart.goToCart", "Go to cart");

  const primaryLinks = items.filter((item) => !libraryRoutes.has(item.href));
  const libraryLinks = items.filter((item) => libraryRoutes.has(item.href));

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href === "/products") {
      return pathname === "/products" || pathname.startsWith("/products/");
    }
    return pathname === href;
  };

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = (formData.get("q") as string)?.trim();
    const base = withLang("/products", lang);
    const [pathPart, queryPart = ""] = base.split("?");
    const params = new URLSearchParams(queryPart);
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `${pathPart}?${qs}` : pathPart);
    onNavigate?.();
  };

  const renderNavItem = (item: NavItem) => {
    const label = item.labelKey ? translate(item.labelKey, item.label ?? item.href) : item.label ?? item.href;
    const active = isActive(item.href);
    const classes = [
      "inline-flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      active
        ? "border-primary/50 bg-primary/15 text-primary"
        : "border-transparent text-muted hover:border-primary/30 hover:bg-card/80 hover:text-fg",
    ].join(" ");
    return (
      <Link
        key={item.href}
        href={withLang(item.href, lang)}
        className={classes}
        onClick={() => onNavigate?.()}
      >
        <span>{label}</span>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
      </Link>
    );
  };

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const Wrapper = variant === "sidebar" ? "aside" : "div";

  return (
    <Wrapper
      className={cn(
        "flex h-full w-full flex-col bg-card px-6 py-10 text-fg",
        variant === "sidebar"
          ? "sticky top-0 h-screen max-w-[300px] flex-shrink-0 border-r border-border shadow-lg backdrop-blur max-[922px]:hidden z-[200]"
          : "max-w-[360px] overflow-y-auto pb-16 pt-8",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-8">
        <Link
          href={withLang(brand.href, lang)}
          className="group flex items-center gap-3 text-sm font-semibold text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          onClick={() => onNavigate?.()}
          aria-label={brandTagline ?? brand.name}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
            {brand.initials}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold">{brand.name}</span>
            {brandTagline ? <span className="text-xs font-medium text-muted">{brandTagline}</span> : null}
          </span>
        </Link>

        <form onSubmit={onSearchSubmit} role="search" className="space-y-2">
          <label htmlFor="sidebar-search" className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Search
          </label>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-inner focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <input
              id="sidebar-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder={searchPlaceholder}
              className="h-9 w-full border-none bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primaryfg"
              aria-label="Submit search"
            >
              Search
            </button>
          </div>
        </form>

        <div className="space-y-6 overflow-y-auto pr-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Sections</p>
            <nav className="mt-3 flex flex-col gap-2" aria-label="Primary navigation">
              {primaryLinks.map(renderNavItem)}
            </nav>
          </div>
          {libraryLinks.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Library</p>
              <nav className="mt-3 flex flex-col gap-2" aria-label="Library navigation">
                {libraryLinks.map(renderNavItem)}
              </nav>
            </div>
          ) : null}
        </div>

        <div className="mt-auto space-y-6">
          <div className="rounded-2xl border border-border bg-card/80 p-5 shadow">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              <span>{cartLabel}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{totalQty}</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3 text-sm text-fg">
              <span className="text-muted">{summaryLabel}</span>
              <span className="text-base font-semibold">{formatCurrency(subtotal || 0, "USD", locale)}</span>
            </div>
            <Link
              href={withLang("/cart", lang)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primaryfg shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              onClick={() => onNavigate?.()}
            >
              {goToCartLabel}
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-3 py-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default SidebarClient;
