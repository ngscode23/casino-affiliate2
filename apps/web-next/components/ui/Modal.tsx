"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@shared/lib/cn";

type Props = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          "min-w-[320px] max-w-[680px] rounded-[var(--radius-lg)] border border-border/40 bg-card/90 p-6 shadow-[var(--elevation-popover)]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
