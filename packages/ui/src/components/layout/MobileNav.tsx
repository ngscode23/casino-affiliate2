// src/components/layout/MobileNav.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetTrigger, SheetContent } from "@ui/components/common/sheet"; // твой обёрнутый Radix
import cn from "@shared/lib/cn"; // если нет, у тебя уже есть /lib/cn.ts
import { useT } from "@shared/lib/useT";
import { useCart } from "@shared/ecom/lib/cart";

// TEMP: switch mobile menu to e-commerce; keep old links commented below
// const linksOld = [
//   { to: "/", label: "Home" },
//   { to: "/compare", label: "Compare" },
//   { to: "/offers", label: "Offers" },
//   { to: "/favorites", label: "Favorites" },
//   { to: "/contact", label: "Contact" },
// ];
import { getUser } from "@shared/lib/auth";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? process.env.SITE_NAME ?? "SITE";

type NavItem = { to: string; key: string };
const baseLinks: NavItem[] = [
  { to: "/", key: "nav.home" },
  { to: "/catalog", key: "nav.catalog" },
  { to: "/cart", key: "nav.cart" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const { totalQty } = useCart();
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

  const links = useMemo(() => {
    const arr = [...baseLinks];
    if (isLoggedIn) arr.splice(2, 0, { to: "/account/orders", key: "nav.orders" as const });
    return arr;
  }, [isLoggedIn]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-[var(--text)] shadow-sm transition hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[rgb(var(--bg-0))]"
        >
          <AnimatePresence initial={false} mode="wait">
            {open ? (
              <motion.span
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[92vw] max-w-[360px] p-0 bg-card text-text border-r border-border shadow-xl dark:bg-[rgb(var(--bg-0)/.92)] dark:text-[var(--text)] dark:border-white/10">
        <motion.div
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
          className="p-5"
        >
          <Link to="/" onClick={() => setOpen(false)} className="block text-xl font-extrabold">
            {SITE_NAME}
          </Link>

          <nav className="mt-4">
            <ul className="flex flex-col gap-1">
              {links.map(l => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-lg px-3 py-2 text-sm text-[var(--text-dim)] hover:bg-card hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]",
                        isActive && "bg-card text-[var(--text)] shadow-sm"
                      )
                    }
                  >
                    {l.to === "/cart" && totalQty > 0
                      ? `${(t(l.key) as string) ?? l.key} (${totalQty})`
                      : (t(l.key) as string) ?? l.key}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-5 border-t border-border pt-4 text-xs text-[var(--text-dim)]">
            <p>18+ • Responsible Gaming • Affiliate disclosure</p>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}


