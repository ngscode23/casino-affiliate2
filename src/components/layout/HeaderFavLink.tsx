import { NavLink } from "react-router-dom";
import cn from "@/lib/cn";
import { useFavorites } from "@/lib/useFavorites";
import { useT } from "@/lib/useT";

type Props = {
  to?: string;
  className?: string;
};

export default function HeaderFavLink({ to = "/favorites", className }: Props) {
  const t = useT();
  const { items } = useFavorites();
  const count = items.length;

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative rounded-lg px-3 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
          isActive && "bg-white/15 text-[var(--text)]",
          className
        )
      }
      aria-label={`Favorites${count ? `: ${count} saved` : ""}`}
    >
      {t("nav.favorites") || "Favorites"}
      {count > 0 && (
        <span
          data-testid="nav:fav-count"
          className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold leading-5 text-white"
          aria-live="polite"
        >
          {count}
        </span>
      )}
    </NavLink>
  );
}
