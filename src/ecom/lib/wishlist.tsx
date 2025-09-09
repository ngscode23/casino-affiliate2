import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { products } from "@/ecom/data/products";
import type { Product } from "@/ecom/lib/types";

type State = { ids: string[] };
type Action = { type: "toggle"; id: string } | { type: "remove"; id: string } | { type: "clear" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle":
      return state.ids.includes(action.id)
        ? { ids: state.ids.filter((x) => x !== action.id) }
        : { ids: [...state.ids, action.id] };
    case "remove":
      return { ids: state.ids.filter((x) => x !== action.id) };
    case "clear":
      return { ids: [] };
    default:
      return state;
  }
}

type Ctx = {
  ids: string[];
  items: Product[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<Ctx | null>(null);
const LS_KEY = "ecom:wishlist";

export function WishlistProvider({ children }: React.PropsWithChildren<{}>) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as State;
    } catch {}
    return { ids: [] };
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const value: Ctx = useMemo(() => {
    const set = new Set(state.ids);
    const items = products.filter((p) => set.has(p.id));
    return {
      ids: state.ids,
      items,
      toggle: (id) => dispatch({ type: "toggle", id }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

