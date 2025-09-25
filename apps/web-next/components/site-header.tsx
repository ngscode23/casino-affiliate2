"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { siteConfig } from "../lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const query = searchParams?.get("q") ?? "";

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = (formData.get("q") as string)?.trim();
    if (!q) {
      router.push("/products");
      return;
    }
    const params = new URLSearchParams({ q });
    router.push(`/products?${params.toString()}`);
    setMobileOpen(false);
  }

  const desktopNav = useMemo(() => siteConfig.nav, []);

  return (
    <header className="w-full border-b border-[rgba(148,163,184,0.14)] bg-[rgba(8,11,18,0.72)] backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]">
            NS
          </span>
          <span className="text-lg font-semibold">{siteConfig.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-3 md:flex" aria-label="Primary">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-[rgba(59,130,246,0.18)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--accent-foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <form onSubmit={onSearchSubmit} className="ml-2 flex items-center gap-2" role="search">
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search products"
              className="h-10 min-w-[200px] rounded-lg border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.55)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[rgba(59,130,246,0.55)] focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
            />
            <button type="submit" className="button button-secondary h-10 px-4">
              Search
            </button>
          </form>
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.18)] md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close navigation" : "Toggle navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <span className="sr-only">Toggle navigation</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[rgba(148,163,184,0.14)] bg-[rgba(8,11,18,0.92)] md:hidden" id="mobile-nav">
          <div className="container flex flex-col gap-3 py-4">
            {desktopNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-[rgba(59,130,246,0.18)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--accent-foreground)]"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <form onSubmit={onSearchSubmit} className="flex flex-col gap-2" role="search">
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search"
                className="h-11 rounded-lg border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.55)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[rgba(59,130,246,0.55)] focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
              />
              <button type="submit" className="button button-primary h-11">
                Search site
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}
