// // src/components/ui/button.tsx
// import { cn } from "@/lib/cn";

// type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
//   variant?: "primary" | "secondary" | "soft" | "ghost";
//   size?: "sm" | "md";
//   isActive?: boolean;
// };

// export default function Button({
//   className,
//   variant = "primary",
//   size = "md",
//   disabled,
//   isActive,
//   ...rest
// }: Props) {
//   const base = "inline-flex items-center justify-center rounded-lg font-semibold focus:outline-none focus-visible:ring-2 ring-offset-2";
//   const sizes = {
//     sm: "min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]",
//     md: "min-h-[44px] px-4 py-2.5 text-[15px] leading-tight"
//   } as const;
//   const variants = {
//     primary: "bg-brand-600 text-white hover:bg-brand-700",
//     secondary: "bg-slate-800 text-white hover:bg-slate-700",
//     soft: "bg-slate-100 text-slate-900 hover:bg-slate-200",
//     ghost: "bg-transparent text-current hover:bg-black/5"
//   } as const;

//   return (
//     <button
//       className={cn(
//         base,
//         sizes[size],
//         variants[variant],
//         isActive && "ring-2 ring-brand-500",
//         disabled && "opacity-50 pointer-events-none",
//         className
//       )}
//       disabled={disabled}
//       {...rest}
//     />
//   );
// }


// src/components/common/button.tsx
import * as React from "react";
import cn from "@/lib/cn";

type Variant = "primary" | "soft" | "secondary" | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center h-10 px-4 rounded-xl font-semibold transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  const styles: Record<Variant, string> = {
    primary:
      "bg-brand-600 hover:bg-brand-700 text-white shadow-[0_10px_20px_rgba(139,92,246,.25)]",
    soft:
      "bg-white/5 hover:bg-white/10 text-white/90 border border-white/10",
    secondary:
      "bg-gradient-to-b from-[rgba(139,92,246,.25)] to-[rgba(139,92,246,.15)] " +
      "text-white border border-white/10 shadow-[0_10px_20px_rgba(139,92,246,.20)]",
    ghost:
      "bg-transparent hover:bg-white/5 text-[var(--text)]"
  };

  return (
    <button className={cn(base, styles[variant], className)} {...props} />
  );
}