import * as React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };

export function ButtonPrimary({ className = "", ...props }: BtnProps) {
  const cls = [
    "rounded-xl px-4 py-2 font-medium",
    "bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)]",
    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
    className,
  ].join(" ");
  return <button className={cls} {...props} />;
}

export function ButtonGhost({ className = "", ...props }: BtnProps) {
  const cls = [
    "rounded-xl px-4 py-2 border border-white/10 text-neutral-200",
    "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
    className,
  ].join(" ");
  return <button className={cls} {...props} />;
}
