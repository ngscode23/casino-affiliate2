"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@shared/lib/cn";

const LS_KEY = "ecom:wishlist";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    if (parsed && Array.isArray(parsed.ids)) return parsed.ids.filter((x: unknown) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    // keep shape compatible with existing provider
    localStorage.setItem(LS_KEY, JSON.stringify({ ids }));
  } catch {
    /* ignore */
  }
}

export function WishlistHeart({
  productId,
  className,
  size = 16,
  ariaLabelAdd = "Add to favorites",
  ariaLabelRemove = "Remove from favorites",
}: {
  productId: string | number;
  className?: string;
  size?: number;
  ariaLabelAdd?: string;
  ariaLabelRemove?: string;
}) {
  const pid = String(productId);
  const [active, setActive] = useState<boolean>(false);

  useEffect(() => {
    setActive(readIds().includes(pid));
  }, [pid]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== LS_KEY) return;
      setActive(readIds().includes(pid));
    };
    const onCustom = () => {
      setActive(readIds().includes(pid));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("wishlist:update", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wishlist:update", onCustom);
    };
  }, [pid]);

  const onClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    // prevent navigation when placed inside links
    e.preventDefault();
    e.stopPropagation();
    const cur = readIds();
    const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
    writeIds(next);
    setActive(next.includes(pid));
    try {
      window.dispatchEvent(new CustomEvent("wishlist:update", { detail: { ids: next } }));
    } catch {
      /* ignore */
    }
  }, [pid]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? ariaLabelRemove : ariaLabelAdd}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer",
        active ? "text-primary" : "text-muted hover:text-primary",
        className,
      )}
    >
      <Heart className="h-4 w-4" style={{ width: size, height: size }} aria-hidden fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export default WishlistHeart;
