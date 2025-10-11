"use server";

import { redirect } from "next/navigation";

import { normalizeImageUrl } from "@/app/products/[slug]/data";
import { createClient } from "@/utils/supabase/server";
import ReviewsClient, { type AccountReview } from "./reviews-client";

type RawReviewRow = {
  review_id: string | null;
  product_id: string | null;
  product_slug: string | null;
  product_title: string | null;
  product_image_path: string | null;
  product_images: unknown;
  rating: number | null;
  title: string | null;
  body: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function toNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function pickImageCandidate(source: unknown): string | null {
  if (!source) return null;
  if (typeof source === "string") {
    return source.trim() || null;
  }
  if (Array.isArray(source)) {
    for (const entry of source) {
      const candidate = pickImageCandidate(entry);
      if (candidate) return candidate;
    }
    return null;
  }
  if (typeof source === "object") {
    const record = source as Record<string, unknown>;
    for (const key of ["url", "path", "src", "image", "href"]) {
      const candidate = toNullableString(record[key]);
      if (candidate) return candidate;
    }
    const sizes = record["sizes"];
    if (sizes && typeof sizes === "object") {
      const sizeRecord = sizes as Record<string, unknown>;
      for (const key of ["large", "medium", "small", "default"]) {
        const candidate = pickImageCandidate(sizeRecord[key]);
        if (candidate) return candidate;
      }
    }
    if (Array.isArray(record["sources"])) {
      const candidate = pickImageCandidate(record["sources"]);
      if (candidate) return candidate;
    }
  }
  return null;
}

function resolveProductImage(path: string | null, images: unknown): string | null {
  const candidate = pickImageCandidate(images) ?? toNullableString(path);
  if (!candidate) return null;
  return normalizeImageUrl(candidate);
}

function mapReview(row: RawReviewRow): AccountReview {
  const fallbackId = `review-${Math.random().toString(36).slice(2)}`;
  const productId = toNullableString(row.product_id) ?? toNullableString(row.review_id) ?? "";
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;
  const productSlug = toNullableString(row.product_slug) ?? productId;
  const imageUrl = resolveProductImage(row.product_image_path, row.product_images);
  const reviewId = toNullableString(row.review_id) ?? (productId || fallbackId);
  const safeProductId = productId || fallbackId;

  return {
    review_id: reviewId,
    product_id: safeProductId,
    product_slug: productSlug,
    product_title: row.product_title ?? "",
    product_image_url: imageUrl,
    rating: Number(row.rating ?? 0) || 0,
    title: row.title ?? "",
    body: row.body ?? "",
    status: row.status ?? "pending",
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export default async function AccountReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/reviews");
  }

  const { data, error } = await supabase.rpc("get_my_reviews");
  if (error) {
    console.error("[account/reviews] get_my_reviews failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: (error as { code?: string })?.code,
    });
  }

  const rawRows = Array.isArray(data) ? (data as RawReviewRow[]) : [];
  const reviews = rawRows.map(mapReview);

  return <ReviewsClient initialReviews={reviews} />;
}
