import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { Product } from "@shared/ecom/lib/types";
import { products } from "@shared/ecom/data/products";
import { getProductsByIds } from "@shared/ecom/api/client";

export type CartItem = { id: string; qty: number };
type CartState = { items: CartItem[] };
type Action =
  | { type: "add"; id: string; qty?: number }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; qty: number }
  | { type: "clear" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      const qty = Math.max(1, action.qty ?? 1);
      const ex = state.items.find((i) => i.id === action.id);
      if (ex) {
        return { items: state.items.map((i) => (i.id === action.id ? { ...i, qty: i.qty + qty } : i)) };
      }
      return { items: [...state.items, { id: action.id, qty }] };
    }
    case "remove":
      return { items: state.items.filter((i) => i.id !== action.id) };
    case "update": {
      const qty = Math.max(0, action.qty);
      if (qty === 0) return { items: state.items.filter((i) => i.id !== action.id) };
      return { items: state.items.map((i) => (i.id === action.id ? { ...i, qty } : i)) };
    }
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

type Ctx = {
  items: Array<CartItem & { product: Product; lineTotal: number }>;
  totalQty: number;
  subtotal: number;
  add: (id: string, qty?: number) => void;
  remove: (id: string) => void;
  update: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);

const LS_KEY = "ecom:cart";

// было:
// export function CartProvider({ children }: React.PropsWithChildren<{}>) {

// стало:
export function CartProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as CartState;
    }catch (err) {
  if (process.env.NODE_ENV === "development") {
    console.debug("Cart error:", err);
  }
}
    return { items: [] };
  });

useEffect(() => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore: переполнено/запрещено, не ломаем UI из-за хранения
  }
}, [state]);

  // Cache for products coming from DB (ids not present in local dataset)
  const [dbMap, setDbMap] = useState<Map<string, Product>>(new Map());

  useEffect(() => {
    // figure out which ids we don't have locally nor in dbMap
    const known = new Set(products.map((p) => p.id));
    const missing = state.items.map((i) => i.id).filter((id) => !known.has(id) && !dbMap.has(id));
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getProductsByIds(missing);
        if (cancelled) return;
        if (rows.length) {
          setDbMap((prev) => {
            const m = new Map(prev);
            rows.forEach((p) => m.set(p.id, p));
            return m;
          });
        }
      } catch {
        // ignore fetch errors to avoid breaking UI
      }
    })();
    return () => { cancelled = true; };
  }, [state.items, dbMap]);

  const value: Ctx = useMemo(() => {
    const map = new Map<string, Product>(products.map((p) => [p.id, p] as const));
    dbMap.forEach((v, k) => map.set(k, v));

    function fallbackProduct(id: string): Product {
      return {
        id,
        slug: id,
        title: "Товар",
        price: 0,
        rating: 0,
        images: [],
        category: "",
        shortDesc: "",
      } as Product;
    }

    const items = state.items
      .map((i) => {
        const p = map.get(i.id) || fallbackProduct(i.id);
        return { ...i, product: p };
      })
      .map((row) => ({ ...row, lineTotal: +(Number(row.product.price || 0) * row.qty).toFixed(2) }));

    const subtotal = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
    const totalQty = items.reduce((s, i) => s + i.qty, 0);

    return {
      items,
      subtotal,
      totalQty,
      add: (id, qty) => dispatch({ type: "add", id, qty }),
      remove: (id) => dispatch({ type: "remove", id }),
      update: (id, qty) => dispatch({ type: "update", id, qty }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state, dbMap]);
  //          ^^^^^^^^^

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}


