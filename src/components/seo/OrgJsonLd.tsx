// src/components/OrgJsonLd.tsx
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@/config";

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}


