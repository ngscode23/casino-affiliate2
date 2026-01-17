import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/env/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      disallow: ["/"],
    },
    host: origin || undefined,
  };
}
