// src/components/FavControl.tsx
import React from "react";
import { useFavorites } from "@/lib/useFavorites";
import { track } from "@/lib/analytics";

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
  titleOn = "Убрать из избранного",
  titleOff = "В избранное",
}: FavControlProps) {
  const { items = [], toggle } = useFavorites();

  const key = String(id ?? "").trim();
  const active = items.includes(key);

  const handleClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const toggled = toggle(key); // может вернуть boolean, а может ничего
    const nextActive = typeof toggled === "boolean" ? toggled : !active;

    onToggle?.(nextActive);
    // Без try/catch: наш track внутри сам безопасен
    track("favorite_toggle", { offer_slug: key, active: nextActive });
  };

  const base = className ?? "inline-flex h-10 w-10 items-center justify-center rounded";
  const colorClass = active ? "text-amber-400" : "text-white/70 hover:text-white";

  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? titleOn : titleOff}
      onClick={handleClick}
      className={`${base} ${colorClass}`}
      data-testid={`fav-btn:${key}`}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span aria-hidden style={{ lineHeight: 1, fontSize: "1.15rem" }}>
        {active ? "★" : "☆"}
      </span>
    </button>
  );
}