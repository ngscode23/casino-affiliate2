import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_SITE_URL?.replace(/\/$/, "") || "";
  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, priority: 1 },
    { url: `${origin}/products`, priority: 0.8 },
    { url: `${origin}/offers`, priority: 0.8 },
    { url: `${origin}/favorites`, priority: 0.6 },
    { url: `${origin}/contact`, priority: 0.5 },
    { url: `${origin}/how-we-rank`, priority: 0.4 },
    { url: `${origin}/affiliate`, priority: 0.5 },
  ];

  try {
    const supabase = await createClient();
    const [prods, offs] = await Promise.all([
      supabase.from("products").select("slug, updated_at").limit(1000),
      supabase.from("offers").select("slug").eq("enabled", true).limit(1000),
    ]);

    if (!prods.error) {
      (prods.data || []).forEach((row: any) => {
        if (row?.slug) entries.push({ url: `${origin}/products/${encodeURIComponent(row.slug)}` });
      });
    }
    if (!offs.error) {
      (offs.data || []).forEach((row: any) => {
        if (row?.slug) entries.push({ url: `${origin}/offers/${encodeURIComponent(row.slug)}` });
      });
    }
  } catch {
    // ignore fetch failures, return static entries only
  }

  return entries;
}
