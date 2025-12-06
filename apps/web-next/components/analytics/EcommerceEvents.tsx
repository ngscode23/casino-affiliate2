"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { computeEventValue, Ga4Item, pushToDataLayer, toGa4Item } from "./dataLayer";

type BasicProduct = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  brand?: string | null;
  variant?: string | null;
};

type ListItem = BasicProduct & {
  position?: number;
  listId?: string | null;
  listName?: string | null;
};

type CartItem = BasicProduct & {
  quantity: number;
};

function resolveCurrency(items: Ga4Item[], fallback?: string | null): string | undefined {
  const fromItems = items.find((item) => item.currency)?.currency;
  return (fromItems || fallback || undefined) ?? undefined;
}

export function ProductAnalytics({ product }: { product: BasicProduct }) {
  const item = useMemo(
    () =>
      toGa4Item({
        id: product.id,
        name: product.title,
        price: product.price ?? undefined,
        currency: product.currency ?? undefined,
        category: product.category ?? undefined,
        brand: product.brand ?? undefined,
        variant: product.variant ?? undefined,
        quantity: 1,
      }),
    [product.brand, product.category, product.currency, product.id, product.price, product.title, product.variant],
  );

  const signature = useMemo(
    () => `${item.item_id}:${item.price ?? ""}:${item.currency ?? ""}:${item.item_category ?? ""}:${item.item_variant ?? ""}`,
    [item],
  );

  useEffect(() => {
    if (!item.item_id) return;
    const currency = resolveCurrency([item], product.currency ?? "USD");
    const value = computeEventValue([item]);
    pushToDataLayer({
      event: "view_item",
      ecommerce: {
        currency,
        value,
        items: [item],
      },
    });
  }, [signature, product.currency]);

  return null;
}

export function ProductListAnalytics({
  items,
  listId,
  listName,
}: {
  items: ListItem[];
  listId?: string | null;
  listName?: string | null;
}) {
  const pathname = usePathname();

  const payloadItems = useMemo(
    () =>
      items.map((item, index) =>
        toGa4Item({
          id: item.id,
          name: item.title,
          price: item.price ?? undefined,
          currency: item.currency ?? undefined,
          category: item.category ?? undefined,
          brand: item.brand ?? undefined,
          variant: item.variant ?? undefined,
          listId: listId ?? item.listId ?? null,
          listName: listName ?? item.listName ?? null,
          index: typeof item.position === "number" ? item.position : index + 1,
        }),
      ),
    [items, listId, listName],
  );

  const signature = useMemo(
    () => payloadItems.map((item) => `${item.item_id}:${item.index ?? ""}`).join("|"),
    [payloadItems],
  );

  useEffect(() => {
    if (!payloadItems.length) return;
    if (!pathname) return;

    // session-level dedupe: listId + items + current path
    const dedupeKey = `${pathname}::${listId ?? "no-list"}`;
    try {
      const storeKey = "__ga4:list_signatures";
      const raw = sessionStorage.getItem(storeKey);
      const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      if (parsed[dedupeKey] === signature) return;
      parsed[dedupeKey] = signature;
      sessionStorage.setItem(storeKey, JSON.stringify(parsed));
    } catch {
      // ignore storage errors (Safari private mode, etc.)
    }

    const currency = resolveCurrency(payloadItems, "USD");
    pushToDataLayer({
      event: "view_item_list",
      ecommerce: {
        currency,
        items: payloadItems,
        item_list_id: listId ?? undefined,
        item_list_name: listName ?? undefined,
      },
    });
  }, [signature, listId, listName, pathname]);

  return null;
}

export function CartAnalytics({
  items,
  currency,
  eventName = "view_cart",
}: {
  items: CartItem[];
  currency?: string | null;
  eventName?: string;
}) {
  const payloadItems = useMemo(
    () =>
      items.map((item, index) =>
        toGa4Item({
          id: item.id,
          name: item.title,
          price: item.price ?? undefined,
          currency: item.currency ?? currency ?? undefined,
          category: item.category ?? undefined,
          brand: item.brand ?? undefined,
          variant: item.variant ?? undefined,
          quantity: item.quantity,
          index: index + 1,
        }),
      ),
    [currency, items],
  );

  const signature = useMemo(
    () => payloadItems.map((item) => `${item.item_id}:${item.quantity ?? 0}`).join("|"),
    [payloadItems],
  );

  useEffect(() => {
    if (!payloadItems.length) return;
    if (typeof window !== "undefined") {
      const win = window as typeof window & { __ga4EventSignatures?: Record<string, string> };
      win.__ga4EventSignatures = win.__ga4EventSignatures || {};
      if (win.__ga4EventSignatures[eventName] === signature) return;
      win.__ga4EventSignatures[eventName] = signature;
    }
    const resolvedCurrency = resolveCurrency(payloadItems, currency ?? "USD");
    const value = computeEventValue(payloadItems);
    pushToDataLayer({
      event: eventName,
      ecommerce: {
        currency: resolvedCurrency,
        value,
        items: payloadItems,
      },
    });
  }, [signature, currency, eventName]);

  return null;
}

export function CheckoutAnalytics({
  items,
  currency,
}: {
  items: CartItem[];
  currency?: string | null;
}) {
  return <CartAnalytics items={items} currency={currency} eventName="begin_checkout" />;
}
