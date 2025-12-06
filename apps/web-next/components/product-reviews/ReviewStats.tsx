import { Star } from "lucide-react";

import { mutedTextSm } from "@/styles/classnames";
import { cn } from "@shared/lib/cn";

import styles from "./reviews.module.css";
import { STAR_INDEXES, type RatingScore } from "./constants";

type Bucket = { score: RatingScore; count: number; percent: number };

type Props = {
  averageLabel: string;
  count: number;
  buckets: Bucket[];
  activeRating: RatingScore | null;
  onBucketSelect: (score: RatingScore) => void;
};

export function ReviewStats({ averageLabel, count, buckets, activeRating, onBucketSelect }: Props) {
  return (
    <aside className={styles.statsCard}>
      <div className={styles.statsHeadline}>
        <span className={styles.statsAverage}>{averageLabel}</span>
        <span className={mutedTextSm}>/ 5</span>
      </div>
      <div className={styles.statsStars}>
        {STAR_INDEXES.map((idx) => (
          <Star
            key={idx}
            className={cn(styles.star, idx < Math.round(Number(averageLabel) || 0) && styles.starFilled)}
          />
        ))}
      </div>
      <p className={styles.statsCount}>{count} ???????</p>
      <ul className={styles.bucketList}>
        {buckets.map((bucket) => {
          const active = activeRating === bucket.score;
          return (
            <li key={bucket.score}>
              <button
                type="button"
                onClick={() => onBucketSelect(bucket.score)}
                className={cn(styles.bucketButton, active ? styles.bucketButtonActive : styles.bucketButtonIdle)}
                aria-pressed={active}
              >
                <span className={styles.bucketScore}>{bucket.score}?</span>
                <div className={styles.bucketBar}>
                  <div className={styles.bucketFill} style={{ width: `${bucket.percent}%` }} aria-hidden />
                </div>
                <span className={styles.bucketCount}>
                  {bucket.count}  {bucket.percent}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default ReviewStats;
