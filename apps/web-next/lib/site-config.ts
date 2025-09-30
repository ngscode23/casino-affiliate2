export const siteConfig = {
  name: "Neon Shop",
  tagline: "Affiliate and e-commerce tooling for growth teams",
  taglineKey: "layout.tagline",
  description:
    "A modern affiliate storefront powered by Next.js and Supabase featuring real-time data, secure auth, and fast product browsing.",
  nav: [
    { href: "/", label: "Home", labelKey: "nav.home" },
    { href: "/products", label: "Products", labelKey: "nav.catalog" },
    { href: "/offers", label: "Offers", labelKey: "nav.offers" },
    { href: "/favorites", label: "Favorites", labelKey: "nav.favorites" },
    { href: "/affiliate", label: "Affiliate", labelKey: "nav.affiliate" },
    { href: "/contact", label: "Contact", labelKey: "nav.contact" },
    { href: "/partner", label: "Partner", labelKey: "nav.partner" },
    { href: "/account", label: "Account", labelKey: "nav.account" },
  ],
  footer: {
    company: "Neon Shop Platform",
    email: "hello@neonshop.dev",
    address: "12 Kohtu tn, Tallinn, Estonia",
    phone: "+372 5551 2345",
  },
  socials: [
    { href: "https://t.me/neonshop", label: "Telegram" },
    { href: "https://www.linkedin.com/company/neonshop", label: "LinkedIn" },
  ],
};

export type SiteConfig = typeof siteConfig;
