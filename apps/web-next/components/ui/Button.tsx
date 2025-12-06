"use client";

import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "soft";
type ButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primaryfg shadow-[var(--elevation-2)] hover:shadow-[var(--elevation-3)] hover:-translate-y-[1px]",
  secondary: "bg-secondary text-secondaryfg border border-border/40 hover:-translate-y-[1px]",
  ghost: "bg-transparent text-fg hover:bg-border/40 border border-transparent",
  outline: "border border-border/60 bg-transparent text-fg hover:border-primary/50 hover:text-primary",
  soft: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/14",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", fullWidth, children, type = "button", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:cursor-not-allowed disabled:opacity-60",
          fullWidth && "w-full",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
