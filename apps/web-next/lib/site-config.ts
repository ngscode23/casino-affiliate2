export const siteConfig = {
  name: "Neon Shop",
  tagline: "Affiliate and e-commerce tooling for growth teams",
  description:
    "A modern affiliate storefront powered by Next.js and Supabase featuring real-time data, secure auth, and fast product browsing.",
  nav: [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/offers", label: "Offers" },
    { href: "/favorites", label: "Favorites" },
    { href: "/affiliate", label: "Affiliate" },
    { href: "/contact", label: "Contact" },
    { href: "/partner", label: "Partner" },
    { href: "/account", label: "Account" },
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

