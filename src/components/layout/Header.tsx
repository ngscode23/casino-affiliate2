// src/components/layout/Header.tsx
import { Link, NavLink } from "react-router-dom";
import Section from "@/components/common/section";
import cn from "@/lib/cn";
import MobileNav from "./MobileNav";
import HeaderFavLink from "@/components/layout/HeaderFavLink";
import UserBadge from "@/components/auth/UserBadge";
import VerifyEmailBanner from "@/components/auth/VerifyEmailBanner";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useT } from "@/lib/useT";
import { useSettings } from "@/lib/useSettings";

export default function Header() {
  const t = useT();
  const { settings } = useSettings();

  const nav = [
    { to: "/offers", label: t("nav.offers"), preload: () => { import("@/pages/Offers"); } },
    { to: "/compare", label: t("nav.compare") },
    { to: "/contact", label: t("nav.contact") },
  ];

  return (
    <>
      <header className=
        "sticky top-0 z-50 border-b border-white/10 bg-[rgb(var(--bg-0)/.72)] backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg-0)/.55)] shadow-[0_8px_30px_rgba(0,0,0,.35)]"
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

          {/* Desktop nav */}
          <nav className="hidden md:flex ml-auto items-center gap-3" aria-label="Main navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={item.preload as any}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-3 text-sm text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    isActive && "text-[var(--text)] border-b-2 border-[rgb(var(--primary))]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {/* Favorites + Language */}
            <HeaderFavLink />
            <LanguageSwitcher />

            {/* CTA */}
            <Link
              to="/compare"
              className="group rounded-xl px-4 py-2 font-medium bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
            >
              {t("nav.compare")}
              <span className="ml-1 opacity-0 group-hover:opacity-100 transition" />
            </Link>

            {/* User badge (desktop) */}
            <div className="ml-2">
              <UserBadge />
            </div>
          </nav>

          {/* Mobile: user + language + menu */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <UserBadge />
            <LanguageSwitcher />
            <MobileNav />
          </div>
        </Section>
      </header>

      {/* Verify email banner below header */}
      <VerifyEmailBanner />
    </>
  );
}
