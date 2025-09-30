import { Suspense } from "react";
import type { Metadata } from "next";

import FavoritesPageClient from "./favorites-client";

export const metadata: Metadata = {
  title: "Favorites - your saved offers",
  description: "Quick access to your saved casino affiliate offers.",
  alternates: { canonical: "/favorites" },
  openGraph: { title: "Favorites", description: "Your saved offers.", url: "/favorites" },
};

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <FavoritesPageClient />
    </Suspense>
  );
}
