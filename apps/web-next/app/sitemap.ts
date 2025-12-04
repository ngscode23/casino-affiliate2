// apps/web-next/app/sitemap.ts
import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin =
    process.env.NEXT_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}` : "");
  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${origin}/products`, priority: 0.8, changeFrequency: "daily" },
    { url: `${origin}/wishlist`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${origin}/contact`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${origin}/affiliate`, priority: 0.5, changeFrequency: "monthly" },
  ];

  try {
    const supabase = await createClient();
    // View `products` не содержит updated_at; берем created_at как ближайший аналог.
    const { data, error } = await supabase.from("products").select("slug, created_at").limit(1000);

    if (!error) {
      (data || []).forEach((row: any) => {
        if (row?.slug) {
          entries.push({
            url: `${origin}/products/${encodeURIComponent(row.slug)}`,
            changeFrequency: "weekly",
            lastModified: row.created_at ? new Date(row.created_at) : undefined,
          });
        }
      });
    }
  } catch {
    // живём дальше со статикой
  }

  return entries;
}
