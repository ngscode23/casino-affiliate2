// src/components/OrgJsonLd.tsx
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@shared/config";
import { serializeJsonLd } from "@shared/lib/jsonld";

function toAbsoluteUrl(value: string | null | undefined, origin: string): string | undefined {
  if (!value) return undefined;
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

export default function OrgJsonLd() {
  const origin = (SITE_URL || "").replace(/\/$/, "");
  const organizationId = origin ? `${origin}/#organization` : undefined;
  const logoUrl = toAbsoluteUrl(SITE_LOGO, origin);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    ...(organizationId ? { "@id": organizationId } : {}),
    name: SITE_NAME,
    ...(origin ? { url: origin } : {}),
    ...(logoUrl ? { logo: logoUrl } : {}),
  };
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
