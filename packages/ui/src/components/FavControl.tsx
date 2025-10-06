// src/components/FavControl.tsx
import React from "react";
import { useFavorites } from "@shared/lib/useFavorites";
import { track } from "@shared/lib/analytics";

export type FavControlProps = {
  id: string;
  className?: string;
  onToggle?: (active: boolean) => void;
  titleOn?: string;
  titleOff?: string;
};

export function FavControl({
  id,
  className,
  onToggle,
  titleOn = "?????? ?? ??????????",
  titleOff = "? ?????????",
}: FavControlProps) {
  const { items = [], toggle } = useFavorites();

  const key = String(id ?? "").trim();
  const active = items.includes(key);

  const handleClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const toggled = toggle(key); // ????? ??????? boolean, ? ????? ??????
    const nextActive = typeof toggled === "boolean" ? toggled : !active;

    onToggle?.(nextActive);
    // ??? try/catch: ??? track ?????? ??? ?????????
    track("favorite_toggle", { offer_slug: key, active: nextActive });
  };

  const base =
    className ??
    "inline-flex h-10 w-10 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40";
  const colorClass = active ? "text-amber-400 fav-pop" : "text-white/70 hover:text-white";

  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? titleOn : titleOff}
      onClick={handleClick}
      className={`${base} ${colorClass} tap-highlight-transparent`}
      data-testid={`fav-btn:${key}`}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
    >
      <span aria-hidden className="text-[1.15rem] leading-none">
        {active ? "?" : "?"}
      </span>
    </button>
  );
}
