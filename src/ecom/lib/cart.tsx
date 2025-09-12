import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Product } from "@/ecom/lib/types";
import { products } from "@/ecom/data/products";

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

  const value: Ctx = useMemo(() => {
    const map = new Map(products.map(p => [p.id, p] as const));

    const items = state.items
      .map(i => ({ ...i, product: map.get(i.id) }))
      .filter((x): x is CartItem & { product: Product } => !!x.product)
      .map(row => ({ ...row, lineTotal: +(row.product.price * row.qty).toFixed(2) }));

    const subtotal = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
    const totalQty = items.reduce((s, i) => s + i.qty, 0);

    return {
      items,
      subtotal,
      totalQty,
      add: (id, qty) => dispatch({ type: "add", id, qty }),
      remove: id => dispatch({ type: "remove", id }),
      update: (id, qty) => dispatch({ type: "update", id, qty }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state, products]); // ← добавили products
  //          ^^^^^^^^^

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

