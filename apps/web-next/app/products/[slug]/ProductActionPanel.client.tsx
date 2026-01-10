"use client";
import { mutedTextXs } from "@/styles/classnames";

import AddToCartButton from "@/app/products/components/AddToCartButton";
import TrackClickButton from "@/app/products/components/TrackClickButton";
import type { ProductSkuOption } from "./data";

type ProductActionPanelProps = {
  productId: string;
  skuOptions?: ProductSkuOption[];
  selectedSkuId?: string | null;
  onSkuChange?: (skuId: string) => void;
  title: string;
  formattedPrice: string;
  compareAtPrice?: string | null;
  finalPrice: number;
  priceCents?: number | null;
  dataset: "shop" | "legacy";
  category?: string | null;
  currency?: string | null;
  variantLabel: string | null;
  onAddAction?: () => void;
  analyticsParams: Record<string, unknown>;
  isAdmin: boolean;
  paymentMethods: string[];
  availabilityCode?: "InStock" | "OutOfStock" | "PreOrder";
};

export default function ProductActionPanel({
  productId,
  skuOptions = [],
  selectedSkuId,
  onSkuChange,
  title,
  formattedPrice,
  compareAtPrice,
  finalPrice,
  priceCents,
  dataset,
  category,
  currency,
  variantLabel,
  onAddAction,
  analyticsParams,
  isAdmin,
  paymentMethods,
  availabilityCode,
}: ProductActionPanelProps) {
  const resolvedSkuId =
    selectedSkuId ?? (skuOptions.length === 1 ? skuOptions[0]?.id ?? productId : productId);

  return (
    <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
      {skuOptions.length > 1 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Вариант</div>
          <div className="flex flex-wrap gap-2">
            {skuOptions.map((option) => {
              const active = option.id === resolvedSkuId;
              const disabled = option.availabilityCode === "OutOfStock";
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSkuChange?.(option.id)}
                  disabled={disabled}
                  className={[
                    "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 bg-card text-fg hover:border-border/80",
                    disabled ? "cursor-not-allowed opacity-40" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={option.availabilityLabel}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
        <span>Купить</span>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          {compareAtPrice ? (
            <div className="text-sm text-muted-foreground line-through">{compareAtPrice}</div>
          ) : null}
          <div className="text-3xl font-semibold text-fg">{formattedPrice}</div>
          {variantLabel ? (
            <div className={mutedTextXs}>Вариант: {variantLabel}</div>
          ) : null}
        </div>
        <AddToCartButton
          productId={resolvedSkuId}
          title={title}
          label="Добавить в корзину"
          className="h-12 rounded-full px-6 text-sm font-semibold"
          quantity={1}
          analyticsParams={{ ...analyticsParams, price: finalPrice }}
          priceCents={priceCents ?? Math.round((finalPrice || 0) * 100)}
          category={category}
          currency={currency}
          recMetadata={{ source: "product_action_panel" }}
          onAddAction={onAddAction}
          availabilityCode={availabilityCode}
        />
        {isAdmin ? <TrackClickButton productId={productId} dataset={dataset} /> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {paymentMethods.map((method) => (
          <div
            key={method}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/80 px-3 py-2 text-sm text-fg/90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {method.slice(0, 2)}
            </span>
            <span>{method}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
