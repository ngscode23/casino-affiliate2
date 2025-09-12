import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import { useParams } from "react-router-dom";
import { products } from "@/ecom/data/products";
import { useEffect, useMemo, useState } from "react";
import Rating from "@/components/common/rating";
import { ButtonPrimary, ButtonGhost } from "@/components/ui/Buttons";
import { useCart } from "@/ecom/lib/cart";
import ReviewForm from "@/components/ReviewForm";
import { getProductBySlug, listProductReviews } from "@/ecom/api/client";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const product = useMemo(() => products.find((p) => p.slug === slug) || null, [slug]);
  const { add } = useCart();
  const [dbId, setDbId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Array<{ user_id: string; rating: number; title: string; body: string; created_at: string }>>([]);
  const [revLoading, setRevLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setRevLoading(true);
      try {
        const p = await getProductBySlug(slug);
        if (cancelled) return;
        if (p?.id) {
          setDbId(p.id);
          const items = await listProductReviews(p.id);
          if (!cancelled) setReviews(items);
        } else {
          setDbId(null);
          setReviews([]);
        }
      } finally {
        if (!cancelled) setRevLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!product) {
    return (
      <PageShell>
        <Seo title="Not found" description="Product not found" ogImage="/og.svg" />
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-6">Product not found.</div>
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
    <PageShell>
      <Seo title={product.title} description={product.shortDesc} ogImage={product.images[0]} jsonLd={jsonLd} />
      <div className="md:grid md:grid-cols-12 md:gap-6">
        <div className="md:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 aspect-[16/10]">
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          </div>
          {product.images.slice(1).length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(1).map((src, i) => (
                <img key={i} src={src} alt={`${product.title} ${i + 2}`} className="rounded-lg border border-white/10 bg-black/20 aspect-[4/3] object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-6 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
          <div className="flex items-center gap-2">
            <Rating value={product.rating} />
            <span className="text-sm text-[var(--text-dim)]">{product.rating.toFixed(1)}</span>
          </div>
          <div className="text-2xl">${product.price.toFixed(2)}</div>
          <p className="text-[var(--text-dim)]">{product.shortDesc}</p>
          {product.specs && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-[var(--text-dim)]">{k}</span>
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
      <div id="details" className="mt-8 rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4">
        <h2 className="text-xl font-semibold">Details</h2>
        <p className="mt-2 text-[var(--text-dim)]">High-quality product built to last. Satisfaction guaranteed.</p>
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {revLoading ? (
          <div className="text-[var(--text-dim)] mt-2">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="text-[var(--text-dim)] mt-2">No reviews yet.</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <Rating value={Number(r.rating) || 0} />
                  <div className="font-semibold">{r.title}</div>
                  <div className="ml-auto text-xs text-[var(--text-dim)]">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-1 text-sm text-white/90">{r.body}</div>
              </li>
            ))}
          </ul>
        )}
        {dbId ? (
          <div className="mt-4">
            <ReviewForm productId={dbId} onSubmitted={async () => {
              const items = await listProductReviews(dbId);
              setReviews(items);
            }} />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

