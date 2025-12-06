import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { SORT_OPTIONS, type SortMode } from "./filter-config";

type Props = {
  theme: "light" | "dark";
  activeSort: SortMode;
  onChange: (mode: SortMode) => void;
};

export function ProductSortBar({ theme, activeSort, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === activeSort)?.label ?? "Newest first";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          theme === "dark"
            ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transform-gpu transition duration-170 ease-out hover:border-white/35 hover:-translate-y-[1px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
            : "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transform-gpu transition duration-170 ease-out hover:border-gray-900 hover:-translate-y-[1px] hover:shadow-[0_16px_40px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        }
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg
          width="20"
          height="14"
          viewBox="0 0 20 14"
          fill="currentColor"
          className={theme === "dark" ? "text-slate-400" : "text-gray-500"}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1.098.36A.66.66 0 0 0 .64.713a.66.66 0 0 0 .002.527.61.61 0 0 0 .48.36c.18.028 17.578.028 17.758-.001a.62.62 0 0 0 .478-.359.5.5 0 0 0 .051-.27c0-.134-.009-.177-.054-.264a.68.68 0 0 0-.315-.304L18.93.35 10.06.347C5.181.346 1.149.352 1.098.36M2.91 4.388a.64.64 0 0 0-.393.332c-.066.127-.068.43-.003.551a.8.8 0 0 0 .302.293l.094.046h14.18l.095-.046a.62.62 0 0 0 .352-.604.62.62 0 0 0-.365-.544l-.102-.046-7.04-.004c-5.638-.003-7.056.002-7.12.022M4.734 8.42a.6.6 0 0 0-.304.247.622.622 0 0 0 .268.91l.112.053h10.38l.112-.052a.623.623 0 0 0 .268-.911.6.6 0 0 0-.31-.248c-.098-.038-.213-.039-5.265-.038-5.005.001-5.168.002-5.261.039m2.605 3.98a.63.63 0 0 0-.518.735c.029.142.06.204.153.307.097.107.211.17.355.197.167.03 5.178.03 5.342 0a.53.53 0 0 0 .311-.153c.166-.15.24-.37.197-.58a.62.62 0 0 0-.369-.46l-.12-.056-2.63-.003c-1.447-.001-2.671.004-2.721.013"
          />
        </svg>
        <span>{activeSortLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""} ${
            theme === "dark" ? "text-slate-400" : "text-gray-500"
          }`}
        />
      </button>
      {open ? (
        <div
          className={
            theme === "dark"
              ? "absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-white/15 bg-[#0f131d] p-1 shadow-2xl shadow-black/40 backdrop-blur-lg"
              : "absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-gray-200 bg-white p-1 shadow-2xl"
          }
          role="menu"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-medium transform-gpu transition duration-150 ease-out hover:-translate-y-[1px] ${
                activeSort === option.value
                  ? theme === "dark"
                    ? "bg-emerald-400/20 text-emerald-50 shadow-[0_14px_32px_rgba(0,0,0,0.6)]"
                    : "bg-gray-900 text-white shadow-[0_14px_32px_rgba(15,23,42,0.32)]"
                  : theme === "dark"
                    ? "text-slate-200 hover:bg-white/5"
                    : "text-gray-700 hover:bg-gray-50"
              }`}
              role="menuitemradio"
              aria-checked={activeSort === option.value}
            >
              <span>{option.label}</span>
              {activeSort === option.value ? (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
