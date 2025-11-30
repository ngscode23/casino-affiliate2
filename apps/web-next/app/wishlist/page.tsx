import { mutedTextSmLegacy } from "@/styles/classnames";
import type { Metadata } from "next";
import { loadProductsData } from "@/app/products/data";
import WishlistClient from "./wishlist-client";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved products in one place.",
  alternates: { canonical: "/wishlist" },
};

export const revalidate = 60;

export default async function WishlistPage() {
  const { products, catalogName } = await loadProductsData({ sort: "recent", dataset: "all" });
  return (
    <div className="bg-background">
      <section className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-8 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Wishlist</h1>
          <p className={mutedTextSmLegacy}>Saved items from {catalogName}</p>
        </header>
      </section>
      <WishlistClient products={products} />
    </div>
  );
}