import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import { useParams } from "react-router-dom";
import { products } from "@/ecom/data/products";
import { useEffect, useMemo, useState } from "react";
import Rating from "@/components/common/rating";
import { ButtonPrimary, ButtonGhost } from "@/components/ui/Buttons";
import { useCart } from "@/ecom/lib/cart";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import { getProductBySlug } from "@/ecom/api/client";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const product = useMemo(() => products.find((p) => p.slug === slug) || null, [slug]);
  const { add } = useCart();
  const [dbId, setDbId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      try {
        const p = await getProductBySlug(slug);
        if (cancelled) return;
        if (p?.id) {
          setDbId(p.id);
        } else {
          setDbId(null);
        }
      } finally {
        /* handled */
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!product) {
    return (
      <PageShell className="bg-bg text-text">
        <Seo title="Not found" description="Product not found" ogImage="/og.svg" />
        <div className="rounded-2xl border border-border bg-card p-6">Product not found.</div>
      </PageShell>
    );
  }

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      image: product.images,
      description: product.shortDesc,
      sku: product.id,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: product.price.toFixed(2),
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating.toFixed(1),
        reviewCount: 25,
      },
    },
  ];

  return (
    <PageShell className="bg-bg text-text">
      <Seo title={product.title} description={product.shortDesc} ogImage={product.images[0]} jsonLd={jsonLd} />
      <div className="md:grid md:grid-cols-12 md:gap-6">
        <div className="md:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-border bg-card aspect-[16/10]">
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          </div>
          {product.images.slice(1).length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(1).map((src, i) => (
                <img key={i} src={src} alt={`${product.title} ${i + 2}`} className="rounded-lg border border-border bg-card aspect-[4/3] object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-6 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
          <div className="flex items-center gap-2">
            <Rating value={product.rating} />
            <span className="text-sm text-muted">{product.rating.toFixed(1)}</span>
          </div>
          <div className="text-2xl text-[color:var(--ui-accent)] font-semibold">${product.price.toFixed(2)}</div>
          <p className="text-muted">{product.shortDesc}</p>
          {product.specs && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                  <span className="text-muted">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <ButtonPrimary onClick={() => add(product.id, 1)}>Add to cart</ButtonPrimary>
            <ButtonGhost asChild>
              <a href="#details">Details</a>
            </ButtonGhost>
          </div>
        </div>
      </div>
      <div id="details" className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">Details</h2>
        <p className="mt-2 text-muted">High-quality product built to last. Satisfaction guaranteed.</p>
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {dbId ? (
          <div className="mt-3">
            <ReviewList sourceSchema="public" sourceTable="ecom_products" sourcePk={dbId} reloadKey={reloadKey} />
          </div>
        ) : (
          <div className="text-muted mt-2">No reviews yet.</div>
        )}
        {dbId ? (
          <div className="mt-4">
            <ReviewForm productId={dbId} onSubmitted={() => setReloadKey((k) => k + 1)} />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

