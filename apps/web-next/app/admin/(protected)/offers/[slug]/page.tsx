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

type AdminOfferEditorPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminOfferEditorPage({ params }: AdminOfferEditorPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug ?? "");
  return (
    <Suspense fallback={<OfferEditorSkeleton />}>
      <OfferEditorClient slug={decodedSlug} />
    </Suspense>
  );
}
