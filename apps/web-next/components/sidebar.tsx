import { siteConfig } from "../lib/site-config";
import SidebarClient from "./sidebar.client";

function toInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase());
  const initials = letters.slice(0, 2).join("");
  return initials || "NS";
}

export function Sidebar() {
  const { nav, name, tagline } = siteConfig;
  return (
    <SidebarClient
      navItems={nav}
      brand={{ name, initials: toInitials(name), href: "/", tagline }}
      tagline={tagline}
    />
  );
}

export default Sidebar;
