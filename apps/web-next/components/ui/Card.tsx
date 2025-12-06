import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type Props<T extends ElementType = "div"> = {
  as?: T;
} & HTMLAttributes<HTMLElement>;

export function Card<T extends ElementType = "div">({ as, className, children, ...rest }: Props<T>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={cn(
        "rounded-[var(--radius-lg)] border border-border/40 bg-card/80 shadow-[var(--elevation-1)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default Card;
