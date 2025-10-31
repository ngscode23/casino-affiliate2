import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_SITE_URL?.replace(/\/$/, "") || "";
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
