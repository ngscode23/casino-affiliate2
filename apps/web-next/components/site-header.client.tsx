"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { siteConfig } from "../lib/site-config";
import { useCart } from "@shared/ecom/lib/cart";
import { useI18n } from "@shared/lib/i18n";
import { useT } from "@shared/lib/useT";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import ThemeToggle from "@ui/components/ThemeToggle";
import LanguageSwitcher from "@ui/components/layout/LanguageSwitcher";

type NavItem = {
  href: string;
  label?: string;
  labelKey?: string;
};
type ResolvedNavItem = NavItem & { resolvedLabel: string };

function withLang(href: string, lang: string) {
  if (!lang || lang === "en") return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : `${path}?lang=${lang}`;
}

export function SiteHeaderClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useI18n();
  const { totalQty } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const searchQuery = sanitizeSearchParam(searchParams?.get("q"));
  const navConfig = useMemo<NavItem[]>(() => siteConfig.nav, []);

  const translate = useCallback(
    (key: string, fallback: string) => {
      if (!key) return fallback;
      const value = t(key);
      return value && value !== key ? value : fallback;
    },
    [t],
  );

  const headerCopy = useMemo(() => {
    const taglineKey = siteConfig.taglineKey ?? "";
    const resolvedTagline =
      taglineKey && taglineKey.trim().length > 0
        ? translate(taglineKey, siteConfig.tagline ?? "")
        : siteConfig.tagline ?? "";
    return {
      searchPlaceholder: translate("header.searchPlaceholder", "Search products"),
      searchLabel: translate("header.searchLabel", "Search"),
      searchButton: translate("header.searchButton", "Search"),
      cartLabel: translate("nav.cart", "Cart"),
      tagline: resolvedTagline,
    };
  }, [translate]);

  const navItems = useMemo<ResolvedNavItem[]>(
    () =>
      navConfig.map((item) => {
        const base = item.label ?? item.href;
        const resolvedLabel = item.labelKey ? translate(item.labelKey, base) : base;
        return { ...item, resolvedLabel };
      }),
    [navConfig, translate],
  );

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
    const baseHref = withLang("/products", lang);
    const [pathPart, queryPart = ""] = baseHref.split("?");
    const params = new URLSearchParams(queryPart);
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    setMenuOpen(false);
    router.push(qs ? `${pathPart}?${qs}` : pathPart);
  };

  const renderNavLink = (item: ResolvedNavItem, variant: "desktop" | "mobile") => {
    const label = item.resolvedLabel;
    const active = isActive(item.href);

    const baseClasses =
      variant === "desktop"
        ? "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        : "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition";

    const activeClasses =
      variant === "desktop"
        ? "bg-primary text-primaryfg shadow-[0_14px_32px_-20px_rgba(252,50,114,0.46)]"
        : "border border-primary/40 bg-primary/15 text-primary";

    const inactiveClasses =
      variant === "desktop"
        ? "border border-transparent bg-card/50 text-muted hover:border-primary/30 hover:text-primary"
        : "border border-border/40 bg-card/60 text-muted hover:border-primary/30 hover:text-primary";

    return (
      <Link
        key={item.href}
        href={withLang(item.href, lang)}
        prefetch={false}
        onClick={() => setMenuOpen(false)}
        className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
      >
        <span>{label}</span>
        {active ? <span className="hidden lg:flex h-1.5 w-1.5 rounded-full bg-primaryfg" aria-hidden /> : null}
      </Link>
    );
  };

  const renderSearchForm = (variant: "desktop" | "mobile") => (
    <form onSubmit={onSearchSubmit} className={variant === "desktop" ? "hidden flex-1 md:flex" : "flex flex-col gap-3"} role="search">
      <label className={variant === "desktop" ? "sr-only" : "text-xs font-semibold uppercase tracking-[0.32em] text-muted"} htmlFor={`header-search-${variant}`}>
        {headerCopy.searchLabel}
      </label>
      <div className={variant === "desktop" ? "flex w-full items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "flex flex-col gap-2"}>
        <input
          id={`header-search-${variant}`}
          name="q"
          type="search"
          defaultValue={searchQuery}
          placeholder={headerCopy.searchPlaceholder}
          className={
            variant === "desktop"
              ? "w-full border-none bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
              : "h-12 rounded-xl border border-border/50 bg-card/70 px-4 text-sm text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
          }
        />
        <button
          type="submit"
          className={
            variant === "desktop"
              ? "inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px] hover:shadow-[0_20px_44px_-28px_rgba(252,50,114,0.44)]"
              : "inline-flex h-11 items-center justify-center rounded-full border border-primary/50 bg-primary px-5 text-sm font-semibold text-primaryfg shadow-[0_20px_48px_-32px_rgba(252,50,114,0.38)] transition hover:-translate-y-[1px]"
          }
        >
          {headerCopy.searchButton}
        </button>
      </div>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link
          href={withLang("/", lang)}
          prefetch={false}
          className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-4 py-2 text-sm font-semibold text-fg transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-base font-bold text-primary">
            {siteConfig.name.slice(0, 1)}
          </span>
          <span className="flex flex-col leading-tight">
            <span>{siteConfig.name}</span>
            {headerCopy.tagline ? <span className="text-xs font-medium text-muted">{headerCopy.tagline}</span> : null}
          </span>
        </Link>

        {renderSearchForm("desktop")}

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={withLang("/cart", lang)}
            prefetch={false}
            className="hidden items-center gap-2 rounded-full border border-border/40 bg-card/70 px-3 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg lg:inline-flex"
          >
            <span>{headerCopy.cartLabel}</span>
            <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
              {totalQty}
            </span>
          </Link>
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-card/70 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            <span className="sr-only">{menuOpen ? "Close navigation" : "Open navigation"}</span>
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="text-current">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="text-current">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-6xl items-center gap-2 px-4 pb-3 sm:px-6 md:flex lg:px-8">
        <nav className="flex flex-1 flex-wrap gap-2" aria-label="Main navigation">
          {navItems.map((item) => renderNavLink(item, "desktop"))}
        </nav>
        <Link
          href={withLang("/cart", lang)}
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primaryfg shadow-[0_20px_48px_-30px_rgba(252,50,114,0.52)] transition hover:-translate-y-[1px]"
        >
          <span>{headerCopy.cartLabel}</span>
          <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primaryfg/15 px-2 text-xs text-primaryfg">
            {totalQty}
          </span>
        </Link>
      </div>

      {menuOpen ? (
        <div className="md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 border-t border-border/40 bg-bg/98 px-4 py-6 shadow-[0_28px_64px_-40px_rgba(102,78,55,0.28)] sm:px-6">
            {renderSearchForm("mobile")}
            <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
              {navItems.map((item) => renderNavLink(item, "mobile"))}
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={withLang("/cart", lang)}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-primary/50 bg-primary px-5 text-sm font-semibold text-primaryfg shadow-[0_22px_50px_-32px_rgba(252,50,114,0.38)] transition hover:-translate-y-[1px]"
              >
                {headerCopy.cartLabel} ({totalQty})
              </Link>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default SiteHeaderClient;
