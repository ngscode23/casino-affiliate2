import { siteConfig } from "@/lib/site-config";
import SiteHeaderClient, { type NavItem } from "./site-header.client";

export type { NavItem } from "./site-header.client";

export type HeaderCatalogCategory = {
  slug: string;
  title: string;
  description: string | null;
};

export type SiteHeaderProps = {
  navItems?: NavItem[];
  catalogCategories?: HeaderCatalogCategory[];
};

export function SiteHeader({ navItems, catalogCategories }: SiteHeaderProps) {
  const { nav, name, tagline } = siteConfig;
  const resolvedNav = navItems && navItems.length > 0 ? navItems : nav;
  return (
    <SiteHeaderClient
      navItems={resolvedNav}
      brandName={name}
      tagline={tagline}
      catalogCategories={catalogCategories}
    />
  );
}

export default SiteHeader;
