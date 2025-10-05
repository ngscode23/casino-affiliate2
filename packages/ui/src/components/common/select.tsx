import * as React from "react";
import cn from "@shared/lib/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full h-11 rounded-xl px-3 text-[15px]",
        "bg-[rgb(var(--bg-2)/.9)] border border-white/10",
        "focus:outline-none focus:ring-2 focus:ring-white/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}


