/* eslint-disable @next/next/no-img-element */
// src/components/layout/Header.tsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import LinkButton from "@ui/components/ui/LinkButton";
import Section from "@ui/components/common/section";
import cn from "@shared/lib/cn";
import MobileNav from "./MobileNav";
// import HeaderFavLink from "@ui/components/layout/HeaderFavLink";
import UserBadge from "@ui/components/auth/UserBadge";
import VerifyEmailBanner from "@ui/components/auth/VerifyEmailBanner";
import LanguageSwitcher from "@ui/components/layout/LanguageSwitcher";
import { useT } from "@shared/lib/useT";
import { useSettings } from "@shared/lib/useSettings";
import { useMemo, useRef, useEffect, useState } from "react";
import categories from "@shared/ecom/data/categories";
import { useCart } from "@shared/ecom/lib/cart";
import ThemeToggle from "@ui/components/ThemeToggle";
import { getUser } from "@shared/lib/auth";

export default function Header() {
  const t = useT();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { totalQty } = useCart();

  // lightweight uncontrolled form refs for search
  const qRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLSelectElement>(null);

  const currentCategory = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get("category") || "all";
    } catch {
      return "all";
    }
  }, [location.search]);

  // TEMP: switch header to e-commerce navigation; keep old links commented
  // const oldNav = [
  //   { to: "/offers", label: t("nav.offers"), preload: () => { import("@web/pages/Offers"); } },
  //   { to: "/compare", label: t("nav.compare") },
  //   { to: "/contact", label: t("nav.contact") },
  // ];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getUser();
        if (mounted) setIsLoggedIn(!!u);
      } catch { if (mounted) setIsLoggedIn(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const nav = useMemo(() => {
    const base = [
      { to: "/", label: t("nav.home") || "Home" },
      { to: "/catalog", label: t("nav.catalog") || "Catalog" },
      { to: "/cart", label: t("nav.cart") || "Cart" },
    ];
    if (isLoggedIn) base.splice(2, 0, { to: "/account/orders", label: "Мои заказы" });
    return base;
  }, [isLoggedIn, t]);

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = qRef.current?.value.trim() || "";
    const category = catRef.current?.value || "all";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category && category !== "all") params.set("category", category);
    navigate(`/catalog${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <header className=
        "sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-white/10 dark:bg-[rgb(var(--bg-0)/.82)] dark:supports-[backdrop-filter]:bg-[rgb(var(--bg-0)/.65)]"
      >
        <Section className="py-0 flex h-16 md:h-20 items-center gap-3">
          {/* Logo */}
          <div className="min-w-0">
            <Link to="/" className="flex items-center gap-2" aria-label="Go to Home">
              {settings.brandLogo ? (
                <img src={settings.brandLogo} alt="logo" className="h-7 w-7 rounded-sm" />
              ) : null}
              <span className="text-xl font-extrabold tracking-tight text-[var(--text)] hover:opacity-90">
                {settings.siteName}
              </span>
            </Link>
          </div>

          {/* Search (desktop) */}
          <div className="hidden md:flex flex-1 items-center justify-center px-2">
            <form onSubmit={onSearchSubmit} className="flex items-center gap-2 w-full max-w-2xl" role="search" aria-label="Site search">
              <label htmlFor="hdr-cat" className="sr-only">Category</label>
              <select
                id="hdr-cat"
                ref={catRef}
                defaultValue={currentCategory}
                className="min-w-[140px] rounded-md border border-border bg-card px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-20)] dark:border-white/15"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <label htmlFor="hdr-q" className="sr-only">Search</label>
              <input
                id="hdr-q"
                ref={qRef}
                type="search"
                placeholder="Search products…"
                className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-20)] dark:border-white/15"
                defaultValue={new URLSearchParams(location.search).get("q") || ""}
              />
              <button
                type="submit"
                className="rounded-md bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[rgb(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgb(var(--primary))]"
              >
                Search
              </button>
            </form>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex ml-auto items-center gap-3" aria-label="Main navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={(item as any).preload as any}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-3 text-sm text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]",
                    isActive && "text-[var(--text)] border-b-2 border-[rgb(var(--primary))]"
                  )
                }
              >
                {item.to === "/cart" ? (
                  <span className="relative inline-flex items-center gap-1">
                    <span>{item.label}</span>
                    {totalQty > 0 && (
                      <span
                        aria-label={`${totalQty} in cart`}
                        className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[rgb(var(--primary))] px-1 text-xs font-semibold text-white"
                      >
                        {totalQty}
                      </span>
                    )}
                  </span>
                ) : (
                  item.label
                )}
              </NavLink>
            ))}

            {/* Info block removed temporarily */}

            {/* Favorites (legacy) disabled */}
            <LanguageSwitcher />
            <ThemeToggle />

            {/* CTA */}
            <LinkButton href="/catalog" size="sm" className="min-w-[96px] shadow-sm">
              {t("nav.catalog") || "Catalog"}
            </LinkButton>

            {/* User badge (desktop) */}
            <div className="ml-2">
              <UserBadge />
            </div>
          </nav>

          {/* Mobile: user + language + menu */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <UserBadge />
            <LanguageSwitcher />
            <ThemeToggle />
            <MobileNav />
          </div>
        </Section>
      </header>

      {/* Verify email banner below header */}
      <VerifyEmailBanner />

      {/* Category strip under header */}
      <Section className="py-2 border-b border-border">
        <nav aria-label="Browse categories" className="-mx-2 overflow-x-auto">
          <div className="px-2 flex items-center gap-2 md:flex-wrap md:justify-start whitespace-nowrap">
            <Link
              to={"/catalog"}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-sm text-muted hover:text-text",
                currentCategory === "all" ? "bg-white/60 dark:bg-white/5 border-border" : "border-border hover:bg-white/60 dark:hover:bg-white/5"
              )}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/catalog?category=${encodeURIComponent(c.slug)}`}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-sm text-muted hover:text-text",
                  currentCategory === c.slug ? "bg-white/60 dark:bg-white/5 border-border" : "border-border hover:bg-white/60 dark:hover:bg-white/5"
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </Section>
    </>
  );
}


