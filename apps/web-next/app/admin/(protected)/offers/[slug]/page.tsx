import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { OfferEditorClient } from "../offer-editor-client";

export const metadata: Metadata = {
  title: "Admin · Edit Offer",
  description: "Create or update an affiliate offer.",
};

function OfferEditorSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
}

export default function AdminOfferEditorPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug ?? "");
  return (
    <Suspense fallback={<OfferEditorSkeleton />}>
      <OfferEditorClient slug={slug} />
    </Suspense>
  );
}
