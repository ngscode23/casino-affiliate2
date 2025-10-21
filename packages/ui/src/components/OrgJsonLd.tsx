// src/components/OrgJsonLd.tsx
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@shared/config";
import { serializeJsonLd } from "@shared/lib/jsonld";

export default function OrgJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    ...(SITE_LOGO ? { logo: SITE_LOGO } : {}),
  };
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}



