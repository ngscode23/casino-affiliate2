export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  mainImage: string | null;
  clicks: number;
  impressions: number;
  dataset: "shop" | "legacy";
  order: number;
};
