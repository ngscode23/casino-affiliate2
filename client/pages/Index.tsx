import ProductCard, { ProductCardProps } from "@/components/product-card";

const products: ProductCardProps[] = [
  {
    title: "Smart Speaker",
    price: "$99.99",
    badge: { label: "Новинка", variant: "new" },
    image: {
      src: "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=800&q=80",
      alt: "Умная колонка в светлом интерьере",
    },
  },
  {
    title: "Wireless Headphones",
    price: "$149.99",
    originalPrice: "$199.99",
    badge: { label: "Скидка", variant: "sale" },
    image: {
      src: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=800&q=80",
      alt: "Беспроводные наушники на нейтральном фоне",
    },
  },
  {
    title: "Smartwatch",
    price: "$249.99",
    badge: { label: "Хит продаж", variant: "bestseller" },
    image: {
      src: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80",
      alt: "Современные умные часы золотистого цвета",
    },
  },
  {
    title: "Smartphone",
    price: "$799.99",
    image: {
      src: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
      alt: "Смартфон белого цвета на столе",
    },
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-4 py-16 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          <header className="text-center">
            <span className="mx-auto inline-flex items-center rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground/70">
              Коллекция сезона
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Лаконичные карточки товаров
            </h1>
            <p className="mt-4 mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Подчеркните премиальность ассортимента и сделайте выбор очевидным с помощью аккуратной сетки, мягких теней и выразительной типографики.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-2 md:gap-8">
            {products.map((product) => (
              <ProductCard key={product.title} {...product} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
