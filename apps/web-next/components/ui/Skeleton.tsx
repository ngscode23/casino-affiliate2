import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type Props = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...rest }: Props) {
  return <div className={cn("animate-pulse rounded-[var(--radius-sm)] bg-border/50", className)} {...rest} />;
}

export default Skeleton;
