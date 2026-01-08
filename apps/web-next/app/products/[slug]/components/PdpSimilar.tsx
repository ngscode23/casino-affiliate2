import { ProductGrid } from "@/components/ProductGrid";
import { sectionTitle } from "@/styles/classnames";

import type { PdpSimilarProps } from "./pdp-types";

export function PdpSimilar({ items }: PdpSimilarProps) {
  if (!items.length) return null;
  return (
    <section className="space-y-4">
      <h2 className={sectionTitle}>Similar products</h2>
      <ProductGrid items={items} wrapWithContainer={false} />
    </section>
  );
}
