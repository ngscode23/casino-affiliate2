// src/components/layout/MobileNav.tsx
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetTrigger, SheetContent } from "@/components/common/sheet"; // твой обёрнутый Radix
import cn from "@/lib/cn"; // если нет, у тебя уже есть /lib/cn.ts

const links = [
  { to: "/", label: "Home" },
  { to: "/compare", label: "Compare" },
  { to: "/offers", label: "Offers" },
  { to: "/favorites", label: "Favorites" },
  { to: "/contact", label: "Contact" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
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

      <SheetContent side="left" className="w-[92vw] max-w-[360px] p-0 bg-[var(--bg-0)] text-[var(--text)]">
        <motion.div
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
          className="p-5"
        >
          <Link to="/" onClick={() => setOpen(false)} className="block text-xl font-extrabold">
            {import.meta.env.VITE_SITE_NAME ?? "SITE"}
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
                        "block rounded-lg px-3 py-2 text-sm hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                        isActive && "bg-white/10"
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-5 border-t border-white/10 pt-4 text-xs text-[var(--text-dim)]">
            <p>18+ • Responsible Gaming • Affiliate disclosure</p>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}


