import { mutedTextXs } from "@/styles/classnames";

import { cn } from "@shared/lib/cn";

import type { ReviewBucket, ReviewBucketScore } from "./pdp-types";

type PdpInfoProps = {
  title: string;
  categoryName?: string | null;
  availabilityLabel?: string;
  reviewAverageLabel: string;
  reviewCount: number;
  reviewBuckets: ReviewBucket[];
  activeReviewFilter: ReviewBucketScore | null;
  onReviewFilterSelect: (value: ReviewBucketScore | null) => void;
  shortDescription?: string | null;
};

export function PdpInfo({
  title,
  categoryName,
  availabilityLabel,
  reviewAverageLabel,
  reviewCount,
  reviewBuckets,
  activeReviewFilter,
  onReviewFilterSelect,
  shortDescription,
}: PdpInfoProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
        <span>Category</span>
        {categoryName ? <span>{categoryName}</span> : null}
      </div>
      <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {availabilityLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
            {availabilityLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
          {reviewAverageLabel}
          <span className="text-muted-foreground">({reviewCount} reviews)</span>
        </span>
      </div>

      {shortDescription ? <p className="text-sm leading-relaxed text-fg/80">{shortDescription}</p> : null}

      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-inner">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Customer rating</div>
          <div className="flex items-end gap-2 text-2xl font-semibold text-fg">
            {reviewAverageLabel}
            <span className="text-xs font-medium text-muted-foreground">/ 5</span>
          </div>
          <div className={mutedTextXs}>
            Based on <span className="font-semibold text-fg">{reviewCount}</span> reviews
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ReviewFilterChip
            label={`All (${reviewCount})`}
            active={activeReviewFilter === null}
            disabled={reviewCount === 0}
            onClick={() => onReviewFilterSelect(null)}
          />
        </div>
        <div className="mt-3 space-y-2">
          {reviewBuckets.map((bucket) => {
            const active = activeReviewFilter === bucket.score;
            const disabled = bucket.count === 0;
            return (
              <button
                key={bucket.score}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onReviewFilterSelect(bucket.score);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                  disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-[1px]",
                )}
                aria-pressed={active}
              >
                <span className="w-10 text-left font-medium text-fg">{bucket.score} star</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/40" aria-hidden>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: `${bucket.percent}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">{bucket.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewFilterChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
        disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-[1px]",
      )}
    >
      {label}
    </button>
  );
}
