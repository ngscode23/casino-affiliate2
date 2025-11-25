import ProductCard from "@/components/ProductCard";

export default function Index() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f7f7] to-[#efefef] py-20">
      <div className="container">
        <section className="mx-auto max-w-6xl">
          <header className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Featured</h1>
            <p className="text-muted-foreground mt-2">Modern craftsmanship, premium materials</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ProductCard
              title="Modern Leather Case"
              subtitle="iPhone 17 Series | Horween® Leather"
              href="https://nomadgoods.com/eu/products/modern-leather-case-black-horween-iphone-17-pro-max"
              images={{
                primary:
                  "https://cdn.shopify.com/s/files/1/0384/6721/files/856504014254_A_LOGO_iPhone.jpg?v=1758045115&width=2000&height=2000&crop=center",
                secondary:
                  "https://cdn.shopify.com/s/files/1/0384/6721/files/856504014254_B_LOGO_iPhone.jpg?v=1758045115&width=2000&height=2000&crop=center",
                altPrimary:
                  "The Nomad Modern Leather Case for iPhone 17 Pro Max in Black Horween leather is shown from the back, featuring MagSafe compatibility and three camera lenses, with the Horween Leather Company logo at the bottom right.",
                altSecondary:
                  "A Nomad Modern Leather Case in black Horween leather protects an iPhone 17 Pro Max as it charges on a white MagSafe pad. The Horween Leather Co. logo at the corner emphasizes its MagSafe compatibility and premium craftsmanship.",
              }}
              colors={["#000000", "#694D3B"]}
              badge="NEW"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
