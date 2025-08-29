import React, { useEffect, useState } from "react";

export type ToastVariant = "info" | "success" | "error";

export type ToastEventDetail = {
  id?: number;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

const BUS_EVENT = "toast:add";

let __id = 1;

export function toast(message: string, opts: { variant?: ToastVariant; durationMs?: number } = {}) {
  if (typeof window === "undefined") return;
  const detail: ToastEventDetail = {
    id: __id++,
    message,
    variant: opts.variant ?? "info",
    durationMs: opts.durationMs ?? 3000,
  };
  window.dispatchEvent(new CustomEvent<ToastEventDetail>(BUS_EVENT as any, { detail } as any));
}

type Item = Required<ToastEventDetail>;

export function ToastContainer() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    function onAdd(e: Event) {
      const d = (e as CustomEvent<ToastEventDetail>).detail;
      if (!d?.message) return;
      const item: Item = {
        id: d.id ?? __id++,
        message: d.message,
        variant: d.variant ?? "info",
        durationMs: d.durationMs ?? 3000,
      };
      setItems((prev) => [...prev, item]);
      // auto-remove
      const t = setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, item.durationMs);
      return () => clearTimeout(t);
    }
    window.addEventListener(BUS_EVENT, onAdd as any);
    return () => window.removeEventListener(BUS_EVENT, onAdd as any);
  }, []);

  if (!items.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2"
      style={{ pointerEvents: "none" }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            "min-w-[220px] max-w-[360px] rounded-xl px-3 py-2 text-sm shadow-lg border",
            "transition-opacity bg-[var(--bg-1)] text-[var(--text)]",
            t.variant === "success" && "border-green-500/40",
            t.variant === "error" && "border-red-500/40",
            t.variant === "info" && "border-white/15",
          ].filter(Boolean).join(" ")}
          style={{ pointerEvents: "auto" }}
          onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

