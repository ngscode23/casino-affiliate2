// src/components/layout/Header.tsx
import { Link, NavLink } from "react-router-dom";
import Section from "@/components/common/section";
import cn from "@/lib/cn";
import MobileNav from "./MobileNav";
import HeaderFavLink from "@/components/layout/HeaderFavLink";
import UserBadge from "@/components/auth/UserBadge";
import VerifyEmailBanner from "@/components/auth/VerifyEmailBanner";

type NavItem = {
  to: string;
  label: string;
  preload?: () => void;
};

const nav: NavItem[] = [
  { to: "/offers", label: "Offers", preload: () => { import("@/pages/Offers"); } },
  { to: "/compare", label: "Compare" }, // Compare грузим eager — прелоад не нужен

  { to: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <>
      {/* <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--bg-0)]/80 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-0)]/60"> */}
      <header className="
  sticky top-0 z-50 border-b border-white/10
  bg-[rgb(var(--bg-0)/.72)] backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg-0)/.55)]
  shadow-[0_8px_30px_rgba(0,0,0,.35)]
">
        <Section className="py-0 flex h-14 md:h-16 items-center gap-3">
          {/* Logo */}
          <div className="min-w-0">
            <Link
              to="/"
              className="text-xl font-extrabold tracking-tight text-[var(--text)] hover:opacity-90"
              aria-label="Go to Home"
            >
              {import.meta.env.VITE_SITE_NAME ?? "SITE"}
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex ml-auto items-center gap-2" aria-label="Main navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={item.preload}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    isActive && "bg-white/10 text-[var(--text)]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {/* Favorites с бейджем */}
            <HeaderFavLink />

            {/* CTA */}
            <Link
              to="/compare"
              hidden
          className="group inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold
             shadow-[0_10px_24px_rgba(139,92,246,.28)] transition"
>
              Start Compare
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition">→</span>
            </Link>

            {/* User badge (desktop) */}
            <div className="ml-2">
              <UserBadge />
            </div>
          </nav>

          {/* Mobile: справа user + бургер */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <UserBadge />
            <MobileNav />
          </div>
        </Section>
      </header>

      {/* Баннер верификации — сразу под хедером */}
      <VerifyEmailBanner />
    </>
  );
}
