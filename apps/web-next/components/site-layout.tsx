import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site-config";
import { buildNavWithCatalogCategories } from "@/lib/catalog/categories";
import { SiteLayoutClient } from "./site-layout.client";

export async function SiteLayout({ children }: { children: ReactNode }) {
  const { navItems, categories } = await buildNavWithCatalogCategories(siteConfig.nav);
  const catalogCategories = categories.map((category) => ({
    slug: category.slug,
    title: category.title,
    description: category.description ?? null,
  }));
  return (
    <SiteLayoutClient navItems={navItems} catalogCategories={catalogCategories} children={children} />
  );
}

export default SiteLayout;
