"use client";

import ShowcaseCard, {
  type ShowcaseCardProps,
} from "./product-card";

const products: ShowcaseCardProps[] = [
  {
    title: "Smart Speaker",
    price: "$99.99",
    badge: { label: "New arrival", variant: "new" },
    image: {
      src: "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=800&q=80",
      alt: "Smart speaker on a timber side table",
    },
  },
  {
    title: "Wireless Headphones",
    price: "$149.99",
    originalPrice: "$199.99",
    badge: { label: "Sale", variant: "sale" },
    image: {
      src: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=800&q=80",
      alt: "Wireless headphones on a magazine stack",
    },
  },
  {
    title: "Smartwatch",
    price: "$249.99",
    badge: { label: "Bestseller", variant: "bestseller" },
    image: {
      src: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80",
      alt: "Smartwatch resting on a charging dock",
    },
  },
  {
    title: "Smartphone",
    price: "$799.99",
    image: {
      src: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
      alt: "Modern smartphone floating over neon backdrop",
    },
  },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-16 sm:py-20">
        <header className="text-center">
          <span className="mx-auto inline-flex items-center rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-accent-foreground/70">
            Curated products
          </span>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Showcase storefront components
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 md:gap-8">
          {products.map((product) => (
            <ShowcaseCard key={product.title} {...product} />
          ))}
        </section>
      </main>
    </div>
  );
}
