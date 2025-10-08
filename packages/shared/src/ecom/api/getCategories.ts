import type { Category } from "@shared/ecom/lib/types";
import { api } from "./client";

type CategoriesResponse = { items: Array<{ slug: string; name: string; icon?: string }>; count: number };

export async function getCategories(): Promise<Category[]> {
  const data = await api.get<CategoriesResponse>("/ecom-categories");
  return data.items.map((c) => ({ id: c.slug, slug: c.slug, name: c.name, icon: c.icon }));
}

export default getCategories;


