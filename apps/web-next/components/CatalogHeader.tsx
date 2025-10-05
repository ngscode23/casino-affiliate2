import { Loader2, RotateCcw, Search } from "lucide-react";
import type { ChangeEvent } from "react";

type Option = {
  value: string;
  label: string;
};

type CatalogHeaderProps = {
  query: string;
  dataset: string;
  datasetOptions: Option[];
  sort: string;
  sortOptions: Option[];
  summary: string;
  onQueryChange: (value: string) => void;
  onDatasetChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onReset: () => void;
  isPending?: boolean;
};

export function CatalogHeader({
  query,
  dataset,
  datasetOptions,
  sort,
  sortOptions,
  summary,
  onQueryChange,
  onDatasetChange,
  onSortChange,
  onReset,
  isPending = false,
}: CatalogHeaderProps) {
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(event.target.value);
  };

  const handleDatasetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onDatasetChange(event.target.value);
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onSortChange(event.target.value);
  };

  return (
    <section className="rounded-2xl border border-border bg-card/80 px-5 py-6 shadow-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Catalog</p>
          <div>
            <h1 className="text-h1">Explore</h1>
            <p className="text-sm text-muted">{summary}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <label className="flex w-full items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-muted focus-within:border-primary/60 focus-within:text-fg focus-within:ring-2 focus-within:ring-primary/60 md:w-72">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
              disabled={isPending}
            />
          </label>

          {datasetOptions.length > 0 ? (
            <select
              value={dataset}
              onChange={handleDatasetChange}
              className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-muted outline-none transition focus:border-primary/60 focus:text-fg focus:ring-2 focus:ring-primary/60 appearance-none"
              disabled={isPending}
            >
              {datasetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          <select
            value={sort}
            onChange={handleSortChange}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-muted outline-none transition focus:border-primary/60 focus:text-fg focus:ring-2 focus:ring-primary/60 appearance-none"
            disabled={isPending}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-medium text-fg transition hover:border-primary/50 hover:bg-primary/10"
            disabled={isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Updating filters…
        </div>
      ) : null}
    </section>
  );
}
