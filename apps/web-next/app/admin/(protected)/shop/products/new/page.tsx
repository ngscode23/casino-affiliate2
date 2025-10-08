import type { Metadata } from "next";
import { Suspense } from "react";

import Skeleton from "@ui/components/common/skeleton";

import { ProductEditorClient } from "../product-editor-client";

export const metadata: Metadata = {
  title: "Admin · Create product",
  description: "Create a new product entry and publish it to the catalog.",
};

function EditorSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export default function AdminProductCreatePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ProductEditorClient />
    </Suspense>
  );
}

