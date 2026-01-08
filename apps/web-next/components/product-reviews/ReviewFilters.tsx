import { cn } from "@shared/lib/cn";

import styles from "./reviews.module.css";
import { SORT_OPTIONS } from "./constants";

type Props = {
  sortKey: string;
  onSortChange: (next: typeof SORT_OPTIONS[number]["value"]) => void;
};

export function ReviewFilters({ sortKey, onSortChange }: Props) {
  return (
    <div className={styles.filters}>
      <span id="reviews-sort-label" className={styles.filtersLabel}>
        Sort by
      </span>
      <div className={styles.filtersShell}>
        <div className={styles.filtersGroup} role="group" aria-labelledby="reviews-sort-label">
          {SORT_OPTIONS.map((option) => {
            const active = sortKey === option.value;
            const baseClasses = styles.filterButton;
            const activeClasses = styles.filterButtonActive;
            const inactiveClasses = styles.filterButtonIdle;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={cn(baseClasses, active ? activeClasses : inactiveClasses)}
                onClick={() => {
                  if (!active) onSortChange(option.value);
                }}
              >
                <span>{option.label}</span>
                <span
                  className={cn(styles.filterDot, active ? styles.filterDotActive : styles.filterDotIdle)}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ReviewFilters;
