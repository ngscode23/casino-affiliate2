import type { HTMLAttributes } from "react";
import cn from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement>;

// src/components/common/section.tsx
export default function Section({ className, ...p }: Props) {
  return <section className={cn("max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8", className)} {...p} />;
}
