import Link from "next/link";
import dynamic from "next/dynamic";

import { cn } from "@shared/lib/cn";

import type { AdminStats, SelectionState } from "./pdp-types";
import type { ProductData, ProductSkuOption, ProductVariantGroup, ProductVariantOption } from "../data";

const ProductActionPanel = dynamic(() => import("../ProductActionPanel.client"), {
  ssr: false,
  loading: () => null,
});

type PdpActionsProps = {
  product: ProductData;
  variants: ProductVariantGroup[];
  selection: SelectionState;
  onVariantSelect: (group: ProductVariantGroup, option: ProductVariantOption) => void;
  formattedPrice: string;
  compareAtPrice: string | null;
  finalPrice: number;
  variantLabel: string | null;
  onAdd: () => void;
  admin: AdminStats;
  paymentMethods: string[];
  skuOptions: ProductSkuOption[];
  selectedSkuId: string | null;
  onSkuChange: (skuId: string) => void;
  availabilityCode?: "InStock" | "OutOfStock" | "PreOrder";
  currency?: string;
};

export function PdpActions({
  product,
  variants,
  selection,
  onVariantSelect,
  formattedPrice,
  compareAtPrice,
  finalPrice,
  variantLabel,
  onAdd,
  admin,
  paymentMethods,
  skuOptions,
  selectedSkuId,
  onSkuChange,
  availabilityCode,
  currency,
}: PdpActionsProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
      {variants.length ? (
        <div className="space-y-4">
          {variants.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const active = selection[group.id]?.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onVariantSelect(group, option)}
                      disabled={option.disabled}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-card text-fg hover:border-border/80",
                        option.disabled ? "cursor-not-allowed opacity-40" : null,
                      )}
                      title={option.disabled ? "Unavailable" : option.label}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ProductActionPanel
        productId={product.id}
        skuOptions={skuOptions}
        selectedSkuId={selectedSkuId}
        onSkuChange={onSkuChange}
        title={product.title}
        formattedPrice={formattedPrice}
        compareAtPrice={compareAtPrice}
        finalPrice={finalPrice}
        priceCents={Math.round(Math.max(0, finalPrice * 100))}
        dataset={product.dataset}
        category={product.category?.slug}
        currency={currency ?? product.currency}
        variantLabel={variantLabel}
        onAddAction={onAdd}
        analyticsParams={{
          product_id: selectedSkuId ?? product.id,
          slug: product.slug,
          variant: variantLabel ?? undefined,
          dataset: product.dataset,
        }}
        isAdmin={admin.isAdmin}
        paymentMethods={paymentMethods}
        availabilityCode={availabilityCode ?? product.availabilityCode}
      />

      <div className="pt-3 text-xs text-muted-foreground">
        <span>Not sure? Contact </span>
        <Link
          href={{
            pathname: "/contact",
            query: {
              topic: "product",
              sku: product.sku ?? product.id,
            },
          }}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          customer support
        </Link>
      </div>
    </div>
  );
}
