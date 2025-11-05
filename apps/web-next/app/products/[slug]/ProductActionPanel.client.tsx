"use client";

import AddToCartButton from "@/app/products/components/AddToCartButton";
import TrackClickButton from "@/app/products/components/TrackClickButton";

type ProductActionPanelProps = {
  productId: string;
  title: string;
  formattedPrice: string;
  compareAtPrice?: string | null;
  finalPrice: number;
  dataset: "shop" | "legacy";
  variantLabel: string | null;
  onAddAction?: () => void;
  analyticsParams: Record<string, unknown>;
  isAdmin: boolean;
  paymentMethods: string[];
};

export default function ProductActionPanel({
  productId,
  title,
  formattedPrice,
  compareAtPrice,
  finalPrice,
  dataset,
  variantLabel,
  onAddAction,
  analyticsParams,
  isAdmin,
  paymentMethods,
}: ProductActionPanelProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
        <span>????</span>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          {compareAtPrice ? (
            <div className="text-sm text-muted-foreground line-through">{compareAtPrice}</div>
          ) : null}
          <div className="text-3xl font-semibold text-fg">{formattedPrice}</div>
          {variantLabel ? (
            <div className="text-xs text-muted-foreground">???????: {variantLabel}</div>
          ) : null}
        </div>
        <AddToCartButton
          productId={productId}
          title={title}
          label="???????? ? ???????"
          className="h-12 rounded-full px-6 text-sm font-semibold"
          quantity={1}
          analyticsParams={{ ...analyticsParams, price: finalPrice }}
          onAddAction={onAddAction}
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