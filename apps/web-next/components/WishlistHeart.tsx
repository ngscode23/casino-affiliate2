"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@shared/lib/cn";

// shared cache per page load to avoid multiple GETs
let favoritesCache: string[] | null = null;
let favoritesPromise: Promise<string[]> | null = null;

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
  const [hydrated, setHydrated] = useState(false);

  // simple in-memory cache to avoid N GETs for N hearts
  // shared across component instances on the page
  const loadFavorites = useCallback(async (): Promise<string[]> => {
    if (favoritesCache) return favoritesCache;
    if (favoritesPromise) return favoritesPromise;
    favoritesPromise = fetch("/api/account/favorites", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { items?: Array<{ product_id: string }> };
        favoritesCache = (json.items ?? []).map((i) => i.product_id);
        return favoritesCache;
      })
      .catch(() => {
        favoritesCache = [];
        return favoritesCache;
      })
      .finally(() => {
        favoritesPromise = null;
      });
    return favoritesPromise;
  }, []);

  useEffect(() => {
    let mounted = true;
    loadFavorites()
      .then((ids) => {
        if (!mounted) return;
        setActive(ids.includes(pid));
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [loadFavorites, pid]);

  const onClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    // prevent navigation when placed inside links
    e.preventDefault();
    e.stopPropagation();
    const nextState = !active;
    setActive(nextState);
    const controller = new AbortController();
    const push = async () => {
      try {
        if (nextState) {
          const res = await fetch("/api/account/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ product_id: pid }),
            credentials: "include",
            signal: controller.signal,
          });
          if (!res.ok) {
            const msg = await res.text().catch(() => res.statusText);
            if (res.status === 401 || res.status === 403) {
              // not logged in or blocked by RLS
              // eslint-disable-next-line no-console
              console.warn("Favorites requires login:", msg || res.status);
              setActive(false);
              if (typeof window !== "undefined") {
                const redirect = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?redirect=${redirect}`;
              }
              return;
            }
            throw new Error(`POST /favorites ${res.status}: ${msg}`);
          }
          favoritesCache = Array.from(new Set([...(favoritesCache ?? []), pid]));
        } else {
          const res = await fetch(`/api/account/favorites?product_id=${encodeURIComponent(pid)}`, {
            method: "DELETE",
            credentials: "include",
            signal: controller.signal,
          });
          if (!res.ok) {
            const msg = await res.text().catch(() => res.statusText);
            if (res.status === 401 || res.status === 403) {
              // eslint-disable-next-line no-console
              console.warn("Favorites requires login:", msg || res.status);
              setActive(!nextState); // keep previous state
              if (typeof window !== "undefined") {
                const redirect = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?redirect=${redirect}`;
              }
              return;
            }
            throw new Error(`DELETE /favorites ${res.status}: ${msg}`);
          }
          if (favoritesCache) {
            favoritesCache = favoritesCache.filter((id) => id !== pid);
          }
        }
      } catch {
        // keep UX simple: roll back state and log for debugging
        setActive(!nextState); // rollback on failure
        // eslint-disable-next-line no-console
        console.warn("Failed to update favorites, request rolled back");
      }
    };
    void push();
  }, [active, pid]);

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
      disabled={!hydrated}
    >
      <Heart
        style={{ width: size, height: size }}
        aria-hidden
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

export default WishlistHeart;
