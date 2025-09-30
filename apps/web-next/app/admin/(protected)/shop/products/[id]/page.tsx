
import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { ProductEditorClient } from "../product-editor-client";

interface AdminProductEditPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Admin · Edit product",
  description: "Update product details, status, and pricing.",
};

function EditorSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export default async function AdminProductEditPage({ params }: AdminProductEditPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ProductEditorClient productId={id} />
    </Suspense>
  );
}

