"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import AddToCartButton from "@/app/products/components/AddToCartButton";
import { cn } from "@shared/lib/cn";

type ProductStickyCTAProps = {
  productId: string;
  title: string;
  price: string;
  dataset?: "shop" | "legacy";
  selectedVariantLabel?: string | null;
  quantity?: number;
  addLabel?: string;
  className?: string;
  secondaryAction?: ReactNode;
  analyticsParams?: Record<string, unknown>;
};

const SCROLL_OFFSET = 320;

export default function ProductStickyCTA({
  productId,
  title,
  price,
  dataset,
  selectedVariantLabel,
  quantity = 1,
  addLabel = "В корзину",
  className,
  secondaryAction,
  analyticsParams,
}: ProductStickyCTAProps) {
  const lastKnownScroll = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(query.matches);
      if (!query.matches) {
        setVisible(false);
      }
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    let ticking = false;
    const handle = () => {
      lastKnownScroll.current = window.scrollY || window.pageYOffset;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVisible(lastKnownScroll.current > SCROLL_OFFSET);
          ticking = false;
        });
        ticking = true;
      }
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [isMobile]);

  const analyticsPayload = useMemo(() => {
    const payload: Record<string, unknown> = {
      product_id: productId,
      qty: quantity,
    };
    if (dataset) payload.dataset = dataset;
    if (selectedVariantLabel) payload.variant = selectedVariantLabel;
    return { ...payload, ...(analyticsParams ?? {}) };
  }, [analyticsParams, dataset, productId, quantity, selectedVariantLabel]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-[120%]",
        className,
      )}
      aria-hidden={!visible}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[520px] rounded-2xl border border-border/50 bg-card/95 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1 sm:min-w-[180px]">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Цена</span>
            <span className="text-lg font-semibold text-fg">{price}</span>
            {selectedVariantLabel ? (
              <span className="text-[11px] text-muted-foreground">Выбор: {selectedVariantLabel}</span>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <AddToCartButton
              productId={productId}
              title={title}
              label={addLabel}
              className="order-1 h-11 w-full justify-center rounded-full text-sm font-semibold sm:order-2 sm:w-auto sm:flex-1"
              variant="solid"
              quantity={quantity}
              analyticsParams={analyticsPayload}
            />
            {secondaryAction ? (
              <div className="order-2 sm:order-1 sm:flex-shrink-0">{secondaryAction}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
