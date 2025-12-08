import type { FormEvent } from "react";

export type OrdersFiltersProps = {
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
  onStatusChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  limit: number;
  onPageSizeChange: (value: number) => void;
};

export function OrdersFilters({
  status,
  statusOptions,
  onStatusChange,
  searchValue,
  onSearchChange,
  onSubmit,
  limit,
  onPageSizeChange,
}: OrdersFiltersProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex-1 space-y-3">
        <span id="orders-status-label" className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          Status
        </span>
        <div className="rounded-2xl border border-border/30 bg-card/70 p-1.5">
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="orders-status-label">
            {statusOptions.map((option) => {
              const active = status === option.value;
              const baseClasses =
                "group inline-flex min-w-[120px] items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold tracking-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
              const activeClasses =
                "border-primary/60 bg-primary/10 text-primary shadow-[0_16px_42px_-28px_rgba(252,50,114,0.6)]";
              const inactiveClasses =
                "border-border/30 bg-transparent text-muted-foreground hover:border-primary/30 hover:text-primary";
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  aria-pressed={active}
                  className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
                  onClick={() => onStatusChange(option.value)}
                >
                  <span>{option.label}</span>
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full transition ${active ? "bg-primary" : "bg-border/40 group-hover:bg-primary/70"}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="order-search" className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Search orders
          </label>
          <div className="flex gap-2">
            <input
              id="order-search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Example: order-001"
              className="h-11 flex-1 rounded-xl border border-border/30 bg-card/70 px-4 text-sm text-fg shadow-inner transition focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-primary/60 bg-primary px-5 text-sm font-semibold text-primaryfg shadow-[0_22px_50px_-30px_rgba(252,50,114,0.62)] transition hover:-translate-y-px"
            >
              Search
            </button>
          </div>
        </div>

        <div className="space-y-2 sm:w-44">
          <span id="orders-page-size-label" className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Page size
          </span>
          <div className="rounded-2xl border border-border/30 bg-card/70 p-1.5">
            <div className="flex gap-2" role="group" aria-labelledby="orders-page-size-label">
              {[10, 20, 50].map((size) => {
                const active = limit === size;
                const baseClasses =
                  "group inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
                const activeClasses =
                  "border-primary/60 bg-primary/10 text-primary shadow-[0_16px_42px_-28px_rgba(252,50,114,0.6)]";
                const inactiveClasses =
                  "border-border/30 bg-transparent text-muted-foreground hover:border-primary/30 hover:text-primary";
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={active}
                    className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
                    onClick={() => onPageSizeChange(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
