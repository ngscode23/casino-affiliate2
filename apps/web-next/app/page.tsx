import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductsClient from "./products/products-client";
import { loadProductsData } from "./products/data";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.role && String(user.role).toLowerCase() === "admin") {
    redirect("/admin");
  }

  const { products, structuredData } = await loadProductsData();

  return (
    <div className="relative z-10 flex flex-col gap-20">
      <section className="pt-12 sm:pt-16">
        <div className="flex flex-col gap-8 py-16 text-center lg:py-20 lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Modern affiliate storefront
          </span>
          <div className="max-w-3xl space-y-4 lg:max-w-4xl">
            <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
              Build a Next.js + Supabase affiliate hub
            </h1>
            <p className="text-lg text-muted">
              A complete affiliate stack: curated catalog, product comparison, Supabase Auth, and partner-ready admin tools. Fully configured and ready to launch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:justify-start">
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center rounded-full border border-primary/60 bg-primary px-8 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px]"
            >
              Browse catalog
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-card/60 px-8 text-sm font-medium text-muted transition hover:border-primary/40 hover:text-fg"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="relative">
        {structuredData ? (
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        ) : null}
        <ProductsClient products={products} />
      </section>

      <section className="relative overflow-hidden">
        <div className="flex flex-col gap-6 rounded-[calc(var(--radius)+1rem)] border border-border/40 bg-card/60 px-6 py-16 text-center shadow-card sm:px-10 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="flex-1 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Admin toolkit</p>
            <h3 className="text-2xl font-semibold text-fg lg:text-3xl">Command centre for partners &amp; payouts</h3>
            <p className="text-sm text-muted">
              Manage catalogue metadata, click &amp; conversion events, and partner compliance from one responsive
              dashboard. Extend APIs with Edge Functions when you need bespoke workflows.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Link
              href="/admin"
              className="inline-flex h-12 items-center justify-center rounded-full border border-primary/60 bg-primary px-8 text-sm font-semibold text-primaryfg shadow-[0_28px_68px_-30px_rgba(252,50,114,0.72)] transition hover:-translate-y-[1px] hover:shadow-[0_36px_84px_-32px_rgba(252,50,114,0.84)]"
            >
              Open admin
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
