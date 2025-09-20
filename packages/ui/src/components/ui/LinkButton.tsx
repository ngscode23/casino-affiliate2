import * as React from "react";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
};

export default function LinkButton({ variant = "primary", size = "md", className = "", ...props }: AnchorProps) {
  const base = [
    "inline-flex items-center justify-center rounded-xl font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
  ].join(" ");

  const styles =
    variant === "primary"
      ? "bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:brightness-95"
      : "border border-border bg-white text-muted shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/5";

  const sizes = size === "sm" ? "min-h-[40px] px-3 py-2 text-[13px]" : "min-h-[44px] px-4 py-2";

  return <a className={[base, styles, sizes, className].join(" ")} {...props} />;
}

