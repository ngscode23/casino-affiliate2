export type Product = {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  price: number;
  rating: number; // 0..5
  images: string[];
  imageUrl?: string;
  category: string; // category slug
  tags?: string[];
  shortDesc: string;
  specs?: Record<string, string>;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon?: string; // lucide icon name (optional)
};


