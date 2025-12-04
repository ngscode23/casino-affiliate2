export const siteConfig = {
  name: "Neon Shop",
  tagline: "Электроника и аксессуары с быстрой доставкой",
  taglineKey: "layout.tagline",
  description:
    "Neon Shop – интернет-магазин электроники и аксессуаров: смартфоны, аудио, умный дом и зарядные решения.",
  nav: [
    { href: "/", label: "Home", labelKey: "nav.home" },
    { href: "/products", label: "Catalog", labelKey: "nav.catalog" },
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
