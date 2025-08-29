import * as React from "react";
import cn from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  kind?: "neon" | "flat";
}
export default function Card({ as:Comp="div", kind="neon", className, ...rest }: CardProps) {
  return (
    <Comp
      className={cn(kind === "neon" ? "neon-card" : "card", "p-4 md:p-6", className)}
      {...rest}
    />
  );
}