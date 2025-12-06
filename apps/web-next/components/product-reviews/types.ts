export type ReviewVotes = {
  helpful: number;
  notHelpful: number;
  score: number;
  user_vote: 1 | -1 | null;
};

export type ReviewItem = {
  rating: number;
  title: string;
  body: string;
  created_at: string;
  createdLabel: string;
  author_id: string;
  votes: ReviewVotes;
  reply?: { body: string; created_at: string } | null;
  review_id?: string;
  messages?: Array<{
    id: string;
    parent_id: string | null;
    author_id: string | null;
    author_role: string | null;
    body: string;
    created_at: string;
  }> | null;
};

export type OwnReview = {
  rating: number;
  title: string;
  body: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ReviewsResponse = {
  ok: boolean;
  items: ReviewItem[];
  stats: { avg_rating: number; ratings_count: number } | null;
  own_review?: OwnReview | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  buckets?: Array<{ score?: number; count?: number; percent?: number }>;
  message?: string;
  code?: string;
};

export type Bucket = { score: number; count: number; percent: number };
