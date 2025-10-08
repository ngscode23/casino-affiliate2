"use client";

import { useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@shared/ecom/lib/cart";
import { toast } from "@ui/components/common/toast";
import cn from "@shared/lib/cn";

type Variant = "solid" | "overlay" | "soft";

type AddToCartButtonProps = {
  productId: string;
  title?: string;
  label?: string;
  className?: string;
  variant?: Variant;
  onAddAction?: () => void;
};

export default function AddToCartButton({
  productId,
  title,
  label = "Add to cart",
  className,
  variant = "solid",
  onAddAction,
}: AddToCartButtonProps) {
  const { add } = useCart();
  const [pending, setPending] = useState(false);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (pending) return;
      setPending(true);
      try {
        add(productId, 1);
        const name = (title ?? "").trim() || "Product";
        toast(`${name} added to cart`, { variant: "success" });
        onAddAction?.();
      } finally {
        setTimeout(() => setPending(false), 400);
      }
    },
    [add, onAddAction, pending, productId, title],
  );

  const baseClass =
    "inline-flex items-center justify-center gap-2 px-4 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const variantClassMap: Record<Variant, string> = {
    solid:
      "h-10 rounded-xl bg-slate-900 text-white hover:-translate-y-[1px] hover:bg-slate-800 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:bg-primary dark:hover:bg-primary/90",
    overlay:
      "h-9 rounded-full border border-white/10 bg-white/5 text-white uppercase tracking-[0.32em] hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.25)] focus-visible:ring-2 focus-visible:ring-white/30 dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/20",
    soft:
      "h-11 rounded-full border border-border/30 bg-card/90 text-fg hover:-translate-y-[1px] hover:bg-card focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
  };
  const variantClass = variantClassMap[variant] ?? variantClassMap.solid;

  return (
    <button
      type="button"
      className={cn(baseClass, variantClass, className)}
      onClick={handleClick}
      disabled={pending}
      aria-label={label}
    >
      <ShoppingCart className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
