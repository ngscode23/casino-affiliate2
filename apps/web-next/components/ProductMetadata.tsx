import type { ProductData } from "@/app/products/[slug]/data";
import { formatCurrency } from "@/app/products/currency";
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
    case "draft":
    case "inactive":
    case "discontinued":
      return "Discontinued";
    case "out_of_stock":
    case "unavailable":
      return "OutOfStock";
    default:
      return "InStock";
  }
}

function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(input: string, length: number): string {
  if (!input || input.length <= length) return input;
  const sliced = input.slice(0, Math.max(0, length - 3)).trimEnd();
  return sliced ? `${sliced}...` : input.slice(0, length);
}

function toAbsoluteUrl(value: string | null | undefined, origin: string): string | null {
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).toString();
    }
    if (!origin) return value;
    return new URL(value, origin.endsWith("/") ? origin : `${origin}/`).toString();
  } catch {
    if (!origin) return value;
    const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    if (value.startsWith("/")) return `${base}${value}`;
    return `${base}/${value}`;
  }
}

export default function ProductMetadata({ product, breadcrumbs, canonicalPath }: ProductMetadataProps) {
  const origin = (SITE_URL || "").replace(/\/$/, "");
  const canonical = toAbsoluteUrl(canonicalPath, origin) ?? canonicalPath;

  const productDescription = sanitizeText(product.description ?? product.shortDescription ?? "");
  const metaDescription = truncateText(productDescription, 160);
  const priceValue = Number(product.price ?? 0);
  const price = Number.isFinite(priceValue) ? priceValue : 0;
  const priceCurrency = (product.currency || "").toUpperCase() || "USD";
  const availability = mapAvailability(product.status);
  const availabilityUrl = `https://schema.org/${availability}`;
  const brandText = sanitizeText(product.brand) || SITE_NAME;
  const formattedPrice = product.formattedPrice?.trim() || formatCurrency(price, priceCurrency);

  const breadcrumbTrail: Breadcrumb[] = [
    { name: SITE_NAME, url: "/" },
    ...breadcrumbs,
    { name: product.title, url: canonicalPath },
  ]
    .map((crumb) => {
      const name = sanitizeText(crumb.name) || SITE_NAME;
      const url = crumb.url?.trim() || "/";
      if (!url.startsWith("/") && !/^https?:/i.test(url)) {
        return { name, url: `/${url}` };
      }
      return { name, url };
    })
    .filter((crumb, index, list) => crumb.url && list.findIndex((item) => item.url === crumb.url) === index);

  const imageCandidates = [...product.gallery, product.mainImage, product.fallbackImage].filter(
    (item): item is string => Boolean(item),
  );
  const productImages = Array.from(
    new Set(
      imageCandidates
        .map((image) => toAbsoluteUrl(image, origin))
        .filter((image): image is string => Boolean(image)),
    ),
  );
  const primaryImage = productImages[0] ?? null;

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
    description: productDescription,
    image: productImages.length ? productImages : undefined,
    sku: product.sku ?? undefined,
    productID: product.productUid ?? product.id,
    url: canonical,
    category: breadcrumbTrail.slice(1, -1).map((crumb) => crumb.name).join(" > ") || undefined,
    brand: {
      "@type": "Brand",
      name: brandText,
    },
    offers: {
      "@type": "Offer",
      priceCurrency,
      price: price.toFixed(2),
      availability: availabilityUrl,
      url: canonical,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        ...(origin ? { url: origin } : {}),
      },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }} />
      <div itemScope itemType="https://schema.org/Product" className="hidden">
        <meta itemProp="name" content={product.title} />
        <meta itemProp="description" content={productDescription} />
        <meta itemProp="sku" content={product.sku ?? product.id} />
        <link itemProp="url" href={canonical} />
        <meta itemProp="brand" content={brandText} />
        {productImages.map((image) => (
          <link key={image} itemProp="image" href={image} />
        ))}
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="priceCurrency" content={priceCurrency} />
          <meta itemProp="price" content={price.toFixed(2)} />
          <link itemProp="availability" href={availabilityUrl} />
          <link itemProp="url" href={canonical} />
        </div>
      </div>
      <meta property="og:type" content="product" />
      <meta property="og:title" content={product.title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      {primaryImage ? (
        <>
          <meta property="og:image" content={primaryImage} />
          <meta property="og:image:secure_url" content={primaryImage} />
        </>
      ) : null}
      <meta property="og:price:amount" content={price.toFixed(2)} />
      <meta property="og:price:currency" content={priceCurrency} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.title} />
      <meta name="twitter:description" content={metaDescription} />
      {primaryImage ? <meta name="twitter:image" content={primaryImage} /> : null}
      <meta name="product:price:amount" content={price.toFixed(2)} />
      <meta name="product:price:currency" content={priceCurrency} />
      <meta name="product:availability" content={availability} />
      <meta property="product:availability" content={availabilityUrl} />
      <meta name="product:brand" content={brandText} />
      <meta name="product:condition" content="new" />
      <meta name="product:retailer_item_id" content={product.id} />
      <meta name="product:category" content={breadcrumbTrail.map((crumb) => crumb.name).join(" > ")} />
      <meta name="product:price_formatted" content={formattedPrice} />
    </>
  );
}
