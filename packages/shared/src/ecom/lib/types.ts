export type Product = {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  price: number;
  priceCents?: number | null;
  currency?: string;
  rating: number; // 0..5
  images: string[];
  imageUrl?: string;
  category: string; // category slug
  tags?: string[];
  shortDesc: string;
  specs?: Record<string, string>;
  isAvailable?: boolean | null;
  inventoryStatus?: string | null;
  stockQuantity?: number | null;
  leadTimeDays?: number | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon?: string; // lucide icon name (optional)
};


