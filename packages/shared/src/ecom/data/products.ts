import type { Product } from "@shared/ecom/lib/types";

const img = (n: number) => `https://via.placeholder.com/800x500?text=Product+${n}`;

export const products: Product[] = [
  {
    id: "p1",
    slug: "alpha-headphones",
    title: "Alpha Headphones",
    price: 79.99,
    rating: 4.4,
    images: [img(1)],
    category: "accessories",
    tags: ["audio", "wireless"],
    shortDesc: "Comfortable over-ear wireless headphones with deep bass.",
    specs: { Connectivity: "Bluetooth 5.2", Battery: "30h", Weight: "240g" },
  },
  { id: "p2", slug: "beta-keyboard", title: "Beta Mechanical Keyboard", price: 59.99, rating: 4.2, images: [img(2)], category: "accessories", tags: ["keyboard"], shortDesc: "Compact 75% mechanical keyboard with RGB.", specs: { Switches: "Brown", Layout: "ANSI" } },
  { id: "p3", slug: "gamma-mouse", title: "Gamma Gaming Mouse", price: 39.99, rating: 4.1, images: [img(3)], category: "gaming", tags: ["mouse"], shortDesc: "Lightweight mouse with precise sensor.", specs: { DPI: "16000" } },
  { id: "p4", slug: "omega-monitor", title: "Omega 27'' Monitor", price: 229.0, rating: 4.6, images: [img(4)], category: "electronics", shortDesc: "27-inch 144Hz IPS monitor, 1ms response.", specs: { Refresh: "144Hz", Panel: "IPS" } },
  { id: "p5", slug: "delta-speaker", title: "Delta Bluetooth Speaker", price: 45.0, rating: 4.0, images: [img(5)], category: "electronics", shortDesc: "Portable speaker with rich sound.", tags: ["audio"], specs: { Battery: "12h" } },
  { id: "p6", slug: "epsilon-smartlight", title: "Epsilon Smart Light", price: 19.99, rating: 3.9, images: [img(6)], category: "home", shortDesc: "Smart LED bulb with app control.", specs: { Socket: "E27" } },
  { id: "p7", slug: "zeta-vacuum", title: "Zeta Robot Vacuum", price: 299.99, rating: 4.3, images: [img(7)], category: "home", shortDesc: "Robot vacuum with mapping.", specs: { Runtime: "120m" } },
  { id: "p8", slug: "eta-cookset", title: "Eta Cookware Set", price: 89.99, rating: 4.2, images: [img(8)], category: "home", shortDesc: "Non-stick cookware set, 10 pieces.", specs: { Material: "Aluminum" } },
  { id: "p9", slug: "theta-tent", title: "Theta 2-Person Tent", price: 119.99, rating: 4.5, images: [img(9)], category: "outdoors", shortDesc: "Lightweight tent for weekend trips.", specs: { Weight: "1.8kg" } },
  { id: "p10", slug: "iota-backpack", title: "Iota Hiking Backpack", price: 69.99, rating: 4.1, images: [img(10)], category: "outdoors", shortDesc: "35L backpack with ventilated back.", specs: { Volume: "35L" } },
  { id: "p11", slug: "kappa-lantern", title: "Kappa Camping Lantern", price: 24.99, rating: 4.0, images: [img(11)], category: "outdoors", shortDesc: "Rechargeable LED lantern.", specs: { Brightness: "400lm" } },
  { id: "p12", slug: "lambda-chair", title: "Lambda Office Chair", price: 149.99, rating: 4.2, images: [img(12)], category: "home", shortDesc: "Ergonomic mesh office chair.", specs: { Warranty: "2y" } },
  { id: "p13", slug: "sigma-software", title: "Sigma Photo Editor", price: 49.0, rating: 4.0, images: [img(13)], category: "software", shortDesc: "Lightweight photo editing app license.", specs: { OS: "Win/Mac" } },
  { id: "p14", slug: "tau-antivirus", title: "Tau Antivirus Pro", price: 29.0, rating: 3.8, images: [img(14)], category: "software", shortDesc: "1-year subscription antivirus.", specs: { Devices: "3" } },
  { id: "p15", slug: "upsilon-gamepad", title: "Upsilon Gamepad", price: 34.99, rating: 4.1, images: [img(15)], category: "gaming", shortDesc: "Ergonomic wireless controller.", specs: { Connectivity: "BT/2.4GHz" } },
  { id: "p16", slug: "phi-headset", title: "Phi Gaming Headset", price: 49.99, rating: 4.0, images: [img(16)], category: "gaming", shortDesc: "Surround sound headset with mic.", specs: { Driver: "50mm" } },
  { id: "p17", slug: "chi-streamcam", title: "Chi Stream Camera", price: 89.0, rating: 4.2, images: [img(17)], category: "electronics", shortDesc: "1080p webcam with autofocus.", specs: { Resolution: "1080p" } },
  { id: "p18", slug: "psi-soundbar", title: "Psi Soundbar", price: 129.0, rating: 4.1, images: [img(18)], category: "electronics", shortDesc: "2.1 channel soundbar.", specs: { Power: "120W" } },
  { id: "p19", slug: "omega-deskmat", title: "Omega Desk Mat", price: 19.0, rating: 4.3, images: [img(19)], category: "accessories", shortDesc: "Large anti-slip desk mat.", specs: { Size: "900x400mm" } },
  { id: "p20", slug: "zephyr-usb-hub", title: "Zephyr USB-C Hub", price: 39.0, rating: 4.0, images: [img(20)], category: "accessories", shortDesc: "7-in-1 USB-C hub.", specs: { Ports: "7" } },
];

export default products;


