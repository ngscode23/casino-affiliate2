export type Ga4Item = {
  item_id: string;
  item_name: string;
  price?: number;
  currency?: string;
  item_category?: string | null;
  item_brand?: string | null;
  item_variant?: string | null;
  index?: number;
  quantity?: number;
  item_list_id?: string;
  item_list_name?: string;
};

export function pushToDataLayer(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const win = window as typeof window & { dataLayer?: unknown[] };
  win.dataLayer = Array.isArray(win.dataLayer) ? win.dataLayer : [];
  win.dataLayer.push(payload);
}

function safeNumber(value: number | null | undefined): number | undefined {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return undefined;
  return Number(numeric.toFixed(2));
}

export function toGa4Item(input: {
  id: string;
  name: string;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  brand?: string | null;
  variant?: string | null;
  index?: number;
  quantity?: number;
  listId?: string | null;
  listName?: string | null;
}): Ga4Item {
  return {
    item_id: input.id,
    item_name: input.name,
    price: safeNumber(input.price),
    currency: input.currency ?? undefined,
    item_category: input.category ?? undefined,
    item_brand: input.brand ?? undefined,
    item_variant: input.variant ?? undefined,
    index: typeof input.index === "number" ? input.index : undefined,
    quantity: typeof input.quantity === "number" ? input.quantity : undefined,
    item_list_id: input.listId ?? undefined,
    item_list_name: input.listName ?? undefined,
  };
}

export function computeEventValue(items: Ga4Item[]): number | undefined {
  const total = items.reduce((sum, item) => {
    const price = Number(item.price ?? 0);
    const qty = Number.isFinite(item.quantity) ? Number(item.quantity) : 1;
    const line = Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0;
    return sum + line;
  }, 0);
  const rounded = Number(total.toFixed(2));
  return Number.isFinite(rounded) ? rounded : undefined;
}
