import * as React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };

export function ButtonPrimary({ className = "", ...props }: BtnProps) {
  const cls = [
    "inline-flex items-center justify-center rounded-full border border-primary/60 px-6 py-2.5 text-sm font-semibold",
    "bg-primary text-primaryfg shadow-[0_24px_60px_-32px_rgba(252,50,114,0.72)] transition",
    "hover:-translate-y-[1px] hover:shadow-[0_32px_78px_-34px_rgba(252,50,114,0.84)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    className,
  ].join(" ");
  return <button className={cls} {...props} />;
}

export function ButtonGhost({ className = "", ...props }: BtnProps) {
  const cls = [
    "inline-flex items-center justify-center rounded-full border border-border/60 px-6 py-2.5 text-sm font-medium text-muted transition",
    "bg-card/60 hover:border-primary/40 hover:text-fg hover:shadow-[0_20px_60px_-34px_rgba(6,18,34,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    className,
  ].join(" ");
  return <button className={cls} {...props} />;
}
