import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md";
  variant?: "ghost" | "primary";
};

export default function IconButton({ size = "sm", variant = "ghost", className = "", ...props }: Props) {
  const base = [
    "inline-flex items-center justify-center rounded-full",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
    variant === "primary"
      ? "bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:opacity-90"
      : "border border-white/10 text-neutral-200 hover:bg-white/5",
    size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
  ].join(" ");
  return <button type="button" className={[base, className].join(" ")} {...props} />;
}


