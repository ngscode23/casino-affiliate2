import type { RefObject } from "react";

import { ProductPagination } from "./ProductPagination";
import type { ThemeMode } from "./types.shared";

export type ProductsPaginationProps = {
  theme: ThemeMode;
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
};

export function ProductsPagination({ theme, sentinelRef, hasMore, isLoading, onLoadMore }: ProductsPaginationProps) {
  return (
    <>
      <div ref={sentinelRef} aria-hidden data-testid="catalog-sentinel" />
      <ProductPagination theme={theme} hasMore={hasMore} isLoading={isLoading} onLoadMore={onLoadMore} />
    </>
  );
}
