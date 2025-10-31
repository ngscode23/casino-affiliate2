export const siteConfig = {
  name: "Name",
  tagline: "",
  taglineKey: "layout.tagline",
  description:
    "Subscription",
  nav: [
    { href: "/", label: "Home", labelKey: "nav.home" },
    { href: "/products", label: "Catalog", labelKey: "nav.catalog" },
    { href: "/wishlist", label: "Wishlist", labelKey: "nav.wishlist" },
    { href: "/cart", label: "Cart", labelKey: "nav.cart" },
    { href: "/checkout", label: "Checkout", labelKey: "nav.checkout" },
    { href: "/contact", label: "Contact", labelKey: "nav.contact" },
    { href: "/account", label: "Account", labelKey: "nav.account" },
    { href: "/account/orders", label: "My orders", labelKey: "nav.orders" },
    { href: "/account/reviews", label: "My reviews", labelKey: "nav.myReviews" },
  ],
  footer: {
    company: "Company",
    email: "hello@neonshop.com",
    address: "Adress",
    phone: "+00 00 0000",
  },
  socials: [
    { href: " ", label: "Telegram" },
    { href: " ", label: "LinkedIn" },
  ],
};

export type SiteConfig = typeof siteConfig;
