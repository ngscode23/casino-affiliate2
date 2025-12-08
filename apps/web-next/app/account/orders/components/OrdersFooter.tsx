export type OrdersFooterProps = {
  count: number;
  total: number;
  hasMore: boolean;
  cursor: string | null;
  onResetCursor: () => void;
  onLoadMore: () => void;
};

export function OrdersFooter({ count, total, hasMore, cursor, onResetCursor, onLoadMore }: OrdersFooterProps) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {count} of {total} orders
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {cursor ? (
          <button
            type="button"
            className="rounded-full border border-border/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            onClick={onResetCursor}
          >
            Back to first page
          </button>
        ) : null}
        {hasMore ? (
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-border/40 px-4 py-1.5 text-xs font-semibold text-fg transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onLoadMore}
            disabled={!cursor}
          >
            Load more
          </button>
        ) : (
          <span className="text-muted-foreground/70">You're all caught up.</span>
        )}
      </div>
    </div>
  );
}
