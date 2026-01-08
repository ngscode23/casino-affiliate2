export const siteConfig = {
  name: "Neon Shop",
  tagline: "Modern e-commerce storefront for everyday shopping",
  taglineKey: "layout.tagline",
  description:
    "A modern e-commerce storefront powered by Next.js and Supabase with fast product browsing and secure auth.",
  nav: [
    { href: "/", label: "Home", labelKey: "nav.home" },
    { href: "/products", label: "Catalog", labelKey: "nav.catalog" },
    { href: "/cart", label: "Cart", labelKey: "nav.cart" },
    { href: "/checkout", label: "Checkout", labelKey: "nav.checkout" },
    { href: "/favorites", label: "Favorites", labelKey: "nav.favorites" },
    { href: "/contact", label: "Contact", labelKey: "nav.contact" },
    { href: "/account", label: "Account", labelKey: "nav.account" },
  ],
  footer: {
    company: "Neon Shop LLC",
    email: "hello@neonshop.com",
    address: "12 Kohtu tn, Tallinn, Estonia",
    phone: "+372 5555 1234",
  },
  socials: [
    { href: "https://t.me/neonshop", label: "Telegram" },
    { href: "https://www.linkedin.com/company/neonshop", label: "LinkedIn" },
  ],
};

export type SiteConfig = typeof siteConfig;
