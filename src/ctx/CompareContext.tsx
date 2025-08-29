// src/ctx/CompareContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type CompareItem = {
  slug?: string;
  name: string;
} & Record<string, unknown>;

type Ctx = {
  selected: CompareItem[];
  isSelected: (id: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  max: number;
};

const CompareContext = createContext<Ctx | null>(null);

// helper: как получаем id элемента
const idOf = (x: CompareItem | string) =>
  typeof x === "string" ? x : (x.slug ?? x.name);

export function CompareProvider({
  children,
  max = 4,
}: {
  children: ReactNode;
  max?: number;
}) {
  const [selected, setSelected] = useState<CompareItem[]>([]);

  const isSelected = useCallback(
    (id: string) => selected.some((s) => idOf(s) === id),
    [selected]
  );

  const remove = useCallback((id: string) => {
    setSelected((prev) => prev.filter((s) => idOf(s) !== id));
  }, []);

  // Используем функциональный setState, чтобы не зависеть от isSelected/remove
  const toggle = useCallback(
    (item: CompareItem) => {
      const itemId = idOf(item);
      setSelected((prev) => {
        const exists = prev.some((s) => idOf(s) === itemId);
        if (exists) {
          return prev.filter((s) => idOf(s) !== itemId);
        }
        if (typeof item === "string") return prev;
        if (prev.length >= max) return prev;
        return [...prev, item];
      });
    },
    [max]
  );

  const clear = useCallback(() => setSelected([]), []);

  const value = useMemo<Ctx>(
    () => ({ selected, isSelected, toggle, remove, clear, max }),
    [selected, isSelected, toggle, remove, clear, max]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): Ctx {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}



