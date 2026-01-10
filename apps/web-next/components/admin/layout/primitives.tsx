import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type SurfaceTone = "default" | "muted" | "subtle" | "elevated" | "accent";

const SURFACE_TONE_CLASS: Record<SurfaceTone, string> = {
  default:
    "bg-admin-surface text-admin-text border border-admin-border shadow-admin-card",
  muted:
    "bg-admin-surfaceMuted text-admin-text border border-admin-border shadow-sm",
  subtle:
    "bg-admin-surfaceSubtle text-admin-text border border-admin-border/70 shadow-sm",
  elevated:
    "bg-admin-elevated text-admin-text border border-admin-border shadow-admin-card",
  accent:
    "bg-admin-primary/10 text-admin-primary border border-admin-primary/20 shadow-sm",
};

export type AdminSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
  padded?: boolean | "sm" | "md" | "lg";
};

export function AdminSurface({
  tone = "default",
  className,
  padded = "md",
  children,
  ...rest
}: AdminSurfaceProps) {
  const paddingClass =
    padded === false
      ? ""
      : padded === "sm"
        ? "px-4 py-4"
        : padded === "lg"
          ? "px-8 py-7"
          : "px-6 py-5";

  return (
    <div
      className={clsx(
        "rounded-2xl transition-shadow duration-150",
        SURFACE_TONE_CLASS[tone],
        paddingClass,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function AdminContentWrapper({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function AdminStack({
  className,
  gap = "md",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  gap?: "sm" | "md" | "lg" | "xl";
}) {
  const gapClass =
    gap === "sm"
      ? "gap-4"
      : gap === "lg"
        ? "gap-8"
        : gap === "xl"
          ? "gap-10"
          : "gap-6";
  return (
    <div className={clsx("flex flex-col", gapClass, className)} {...rest}>
      {children}
    </div>
  );
}

export function AdminSectionHeading({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-admin-border/70 pb-4 text-admin-text md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-admin-text">{title}</h2>
        {description ? (
          <p className="text-sm text-admin-textSoft">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}




