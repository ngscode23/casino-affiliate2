// src/pages/Home/index.tsx
import { useMemo } from "react";
import Seo from "@/components/Seo";
import { SITE_URL, BRAND_NAME, BRAND_LOGO } from "@/config";
import { AffiliateHome } from "@/pages/AffiliateHome";

export default function Home() {
  // JSON-LD: Organization
  const orgLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME ?? "CasinoHub",
      url: SITE_URL || (typeof location !== "undefined" ? location.origin : ""),
      ...(BRAND_LOGO ? { logo: BRAND_LOGO } : {}),
    }),
    []
  );

  // JSON-LD: WebSite + SearchAction
  const siteLd = useMemo(() => {
    const origin = SITE_URL || (typeof location !== "undefined" ? location.origin : "");
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: origin,
      name: BRAND_NAME ?? "CasinoHub",
      potentialAction: {
        "@type": "SearchAction",
        // Use existing offers listing search param as on-site search target
        target: `${origin}/offers?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }, []);

  return (
    <>
      <Seo
        title={`${BRAND_NAME ?? "CasinoHub"} — сравнение казино, выплаты и рейтинги`}
        description="Сравнивайте казино по лицензии, скорости выплат и рейтингу. Ответственная игра 18+."
        jsonLd={[orgLd, siteLd]}
        ogImage="/og.svg"
        canonical={SITE_URL}
      />
      <AffiliateHome />
    </>
  );
}
