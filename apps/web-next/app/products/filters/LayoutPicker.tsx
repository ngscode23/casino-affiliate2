"use client";;
import { iconSm } from "@/styles/classnames";

import type { LucideIcon } from "lucide-react";

type Option<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

export default function LayoutPicker<T extends string>({
  value,
  options,
  onChange,
  isPending,
}: {
  value: T;
  options: Option<T>[];
  onChange: (val: T) => void;
  isPending?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-fg">Layout</span>
      <div className="grid gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const active = value === option.value;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              disabled={isPending}
              className={[
                "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                active
                  ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                  : "border-white/10 text-fg/80 hover:border-primary/40 hover:bg-white/10",
                isPending ? "opacity-60" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border transition",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-white/20 bg-white/10 text-muted group-hover:border-primary/40 group-hover:text-primary",
                ].join(" ")}
              >
                <Icon className={iconSm} />
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

