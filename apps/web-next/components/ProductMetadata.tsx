import type { ProductData } from "@/app/products/[slug]/data";
import { formatCurrency } from "@/app/products/[slug]/data";
import { SITE_NAME, SITE_URL } from "@shared/config";
import { makeBreadcrumbsLD, serializeJsonLd } from "@shared/lib/jsonld";

type Breadcrumb = { name: string; url: string };

type ProductMetadataProps = {
  product: ProductData;
  breadcrumbs: Breadcrumb[];
  canonicalPath: string;
};

function mapAvailability(status: string): string {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "preorder":
    case "pre-order":
      return "PreOrder";
    case "out_of_stock":
    case "unavailable":
      return "OutOfStock";
    default:
      return "InStock";
  }
}

export default function ProductMetadata({ product, breadcrumbs, canonicalPath }: ProductMetadataProps) {
  const origin = (SITE_URL || "").replace(/\/$/, "");
  const canonical = origin ? `${origin}${canonicalPath}` : canonicalPath;
  const breadcrumbTrail: Breadcrumb[] = [
    { name: "Главная", url: "/" },
    ...breadcrumbs,
    { name: product.title, url: canonicalPath },
  ];

  const reviewJsonLd = product.recentReviews
    .slice(0, 2)
    .map((review, index) => {
      const trimmedBody = (review.body || "").trim();
      if (!trimmedBody) return null;
      const truncatedBody = trimmedBody.length > 1200 ? `${trimmedBody.slice(0, 1196)} ...` : trimmedBody;
      const name = review.title && review.title.trim() ? review.title.trim() : `Review ${index + 1}`;
      return {
        "@type": "Review",
        datePublished: review.createdAt,
        name,
        reviewBody: truncatedBody,
        author: {
          "@type": "Person",
          name: review.authorLabel,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: Number(review.rating ?? 0).toFixed(1),
          bestRating: "5",
          worstRating: "1",
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const breadcrumbsJsonLd = makeBreadcrumbsLD(origin, breadcrumbTrail);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.shortDescription ?? "",
    image: product.gallery,
    sku: product.sku ?? undefined,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: Number(product.price ?? 0).toFixed(2),
      availability: `https://schema.org/${mapAvailability(product.status)}`,
      url: canonical,
      itemCondition: "https://schema.org/NewCondition",
    },
    review: reviewJsonLd.length ? reviewJsonLd : undefined,
    aggregateRating:
      product.reviewSummary.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.reviewSummary.average ?? 0).toFixed(1),
            reviewCount: product.reviewSummary.count,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }}
      />
      <div itemScope itemType="https://schema.org/Product" className="hidden">
        <meta itemProp="name" content={product.title} />
        <meta itemProp="description" content={product.description ?? product.shortDescription ?? ""} />
        <meta itemProp="sku" content={product.sku ?? product.id} />
        <link itemProp="url" href={canonical} />
        {product.brand ? (
          <meta itemProp="brand" content={product.brand} />
        ) : (
          <meta itemProp="brand" content={SITE_NAME} />
        )}
        {product.gallery.map((image) => (
          <link key={image} itemProp="image" href={image} />
        ))}
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="priceCurrency" content={product.currency} />
          <meta itemProp="price" content={Number(product.price ?? 0).toFixed(2)} />
          <link
            itemProp="availability"
            href={`https://schema.org/${mapAvailability(product.status)}`}
          />
          <link itemProp="url" href={canonical} />
        </div>
      </div>
      <meta property="og:type" content="product" />
      <meta property="og:title" content={product.title} />
      <meta property="og:description" content={product.description ?? product.shortDescription ?? ""} />
      <meta property="og:url" content={canonical} />
      {product.gallery[0] ? <meta property="og:image" content={product.gallery[0]} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.title} />
      <meta name="twitter:description" content={product.description ?? product.shortDescription ?? ""} />
      {product.gallery[0] ? <meta name="twitter:image" content={product.gallery[0]} /> : null}
      <meta name="product:price:amount" content={Number(product.price ?? 0).toFixed(2)} />
      <meta name="product:price:currency" content={product.currency} />
      <meta name="product:availability" content={mapAvailability(product.status)} />
      <meta name="product:brand" content={product.brand ?? SITE_NAME} />
      <meta name="product:condition" content="new" />
      <meta name="product:retailer_item_id" content={product.id} />
      <meta name="product:category" content={breadcrumbTrail.map((crumb) => crumb.name).join(" > ")} />
      <meta name="product:price_formatted" content={formatCurrency(product.price, product.currency)} />
    </>
  );
}
