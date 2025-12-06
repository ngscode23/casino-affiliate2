export const RATING_ORDER = [5, 4, 3, 2, 1] as const;
export type RatingScore = (typeof RATING_ORDER)[number];
export const STAR_INDEXES = [0, 1, 2, 3, 4] as const;

export type SortKey = "newest" | "oldest" | "rating_desc" | "rating_asc";
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "??????? ?????" },
  { value: "oldest", label: "??????? ??????" },
  { value: "rating_desc", label: "?? ???????? (51)" },
  { value: "rating_asc", label: "?? ???????? (15)" },
];

export const MIN_BODY_LENGTH = 24;
