import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/env/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: [],
    },
    host: origin || undefined,
    sitemap: origin ? [`${origin}/sitemap.xml`] : undefined,
  };
}
