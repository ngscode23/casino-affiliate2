"use client";;
import { iconSm } from "@/styles/classnames";

import { useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";

import { useCart } from "@shared/ecom/lib/cart";
import { track } from "@shared/lib/analytics";
import { toast } from "@ui/components/common/toast";
import cn from "@shared/lib/cn";
import { logRecEvent } from "@/lib/recs-events";
import { computeEventValue, pushToDataLayer, toGa4Item } from "@/components/analytics/dataLayer";

type Variant = "solid" | "overlay" | "soft";

function scheduleIdle(callback: () => void) {
  if (typeof window === "undefined") return;
  const win = window as typeof window & {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
  };
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => callback(), { timeout: 1200 });
    return;
  }
  setTimeout(callback, 0);
}

type AddToCartButtonProps = {
  productId: string;
  title?: string;
  label?: string;
  className?: string;
  variant?: Variant;
  onAddAction?: () => void;
  quantity?: number;
  analyticsEventName?: string;
  analyticsParams?: Record<string, unknown>;
  priceCents?: number | null;
  category?: string | null;
  currency?: string | null;
  recMetadata?: Record<string, unknown>;
  availabilityCode?: "InStock" | "OutOfStock" | "PreOrder";
  outOfStockLabel?: string;
};

export default function AddToCartButton({
  productId,
  title,
  label = "Add to cart",
  className,
  variant = "solid",
  onAddAction,
  quantity = 1,
  analyticsEventName = "add_to_cart",
  analyticsParams,
  priceCents = null,
  category = null,
  currency = null,
  recMetadata,
  availabilityCode,
  outOfStockLabel,
}: AddToCartButtonProps) {
  const { add } = useCart();
  const [pending, setPending] = useState(false);
  const isOutOfStock = availabilityCode === "OutOfStock";

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (pending || availabilityCode === "OutOfStock") return;
      setPending(true);
      try {
        add(productId, quantity);
        const name = (title ?? "").trim() || "Product";
        toast(`${name} added to cart`, { variant: "success" });
        try {
        const payload = {
          product_id: productId,
          qty: quantity,
          ...analyticsParams,
        };
        scheduleIdle(() => {
          track({ name: analyticsEventName, params: payload });
        });
      } catch {
        /* noop */
      }
        try {
          const price =
            typeof priceCents === "number"
              ? priceCents / 100
              : typeof analyticsParams?.price === "number"
                ? Number(analyticsParams.price)
                : undefined;
          const item = toGa4Item({
            id: productId,
            name,
            price,
            currency: currency ?? undefined,
            category,
            quantity,
          });
          const eventCurrency = item.currency ?? currency ?? "USD";
          const value = computeEventValue([{ ...item, currency: eventCurrency }]);
          scheduleIdle(() => {
            pushToDataLayer({
              event: "add_to_cart",
              ecommerce: {
                currency: eventCurrency,
                value,
                items: [{ ...item, currency: eventCurrency }],
              },
            });
          });
        } catch {
          /* noop */
        }
        scheduleIdle(() => {
          void logRecEvent({
            event: "add_to_cart",
            productId,
            category: category ?? undefined,
            priceCents: priceCents ?? undefined,
            weight: quantity,
            metadata: recMetadata,
          });
        });
        onAddAction?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast("Не удалось добавить в корзину", { variant: "error" });
        track("cart:add_error", {
          productId,
          message,
          availability: availabilityCode,
        });
      } finally {
        setTimeout(() => setPending(false), 400);
      }
    },
    [
      add,
      analyticsEventName,
      analyticsParams,
      category,
      onAddAction,
      pending,
      priceCents,
      productId,
      quantity,
      recMetadata,
      availabilityCode,
      currency,
      title,
    ],
  );

  const baseClass =
    "inline-flex items-center justify-center gap-2 px-4 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const variantClassMap: Record<Variant, string> = {
    solid:
      "h-10 rounded-xl bg-slate-900 text-white hover:-translate-y-[1px] hover:bg-slate-800 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:bg-primary dark:hover:bg-primary/90",
    overlay:
      "h-9 rounded-full border border-neutral-300 bg-white text-slate-900 uppercase tracking-[0.32em] hover:-translate-y-[1px] hover:border-neutral-400 hover:bg-slate-50 hover:shadow-[0_12px_30px_rgba(15,23,42,0.15)] focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/20 dark:focus-visible:ring-white/30 dark:focus-visible:ring-offset-0",
    soft:
      "h-11 rounded-full border border-border/30 bg-card/90 text-fg hover:-translate-y-[1px] hover:bg-card focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
  };
  const variantClass = variantClassMap[variant] ?? variantClassMap.solid;
  const displayLabel =
    isOutOfStock ? outOfStockLabel ?? "??? ? ???????" : label;
  const isDisabled = pending || isOutOfStock;
  const computedAriaLabel = `${displayLabel} ${title ?? ""}`.trim();

  return (
    <button
      type="button"
      className={cn(baseClass, variantClass, className)}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={computedAriaLabel}
      aria-busy={pending}
    >
      {pending ? <Loader2 className={cn(iconSm, "animate-spin")} aria-hidden /> : <ShoppingCart className={iconSm} aria-hidden />}
      <span>{pending ? "Adding..." : displayLabel}</span>
    </button>
  );
}


