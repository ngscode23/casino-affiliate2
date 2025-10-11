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

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
};

export function Sidebar({ className, onNavigate, variant = "sidebar" }: SidebarProps) {
  const { nav, name, tagline } = siteConfig;
  return (
    <SidebarClient
      navItems={nav}
      brand={{ name, initials: toInitials(name), href: "/", tagline }}
      tagline={tagline}
      className={className}
      onNavigate={onNavigate}
      variant={variant}
    />
  );
}

export default Sidebar;
