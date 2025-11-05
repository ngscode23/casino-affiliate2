import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSurface, AdminStack } from "./primitives";

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

export type AdminPageLayoutProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: AdminBreadcrumb[];
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminPageLayout({
  title,
  description,
  breadcrumbs,
  primaryActions,
  secondaryActions,
  toolbar,
  sidebar,
  children,
  className,
}: AdminPageLayoutProps) {
  return (
    <AdminStack className={clsx("text-admin-text", className)} gap="lg">
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
      />
      {toolbar ? <AdminSurface padded="sm">{toolbar}</AdminSurface> : null}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <AdminStack gap="lg" className="w-full">
            {children}
          </AdminStack>
        </div>
        {sidebar ? (
          <aside className="lg:w-[320px] xl:w-[360px]">
            <AdminStack gap="lg">{sidebar}</AdminStack>
          </aside>
        ) : null}
      </div>
    </AdminStack>
  );
}

type HeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: AdminBreadcrumb[];
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  primaryActions,
  secondaryActions,
}: HeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-admin-border pb-5">
      {breadcrumbs && breadcrumbs.length ? (
        <Breadcrumbs items={breadcrumbs} />
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-admin-text">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-admin-textSoft">{description}</p>
          ) : null}
        </div>
        {(primaryActions || secondaryActions) && (
          <div className="flex flex-col gap-3 lg:items-end">
            {secondaryActions ? (
              <div className="flex flex-wrap gap-2">{secondaryActions}</div>
            ) : null}
            {primaryActions ? (
              <div className="flex flex-wrap gap-2">{primaryActions}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: AdminBreadcrumb[] }) {
  return (
    <nav aria-label="breadcrumbs">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-admin-textSubtle">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-admin-textSoft transition hover:text-admin-text"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-admin-textSubtle">{item.label}</span>
              )}
              {!isLast ? <span className="text-admin-textSubtle">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AdminInfoPanel({
  title,
  children,
  actions,
}: {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <AdminSurface tone="muted" padded="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-admin-text">
              {title}
            </h3>
          </div>
          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
        <div className="space-y-4 text-sm text-admin-textSoft">{children}</div>
      </div>
    </AdminSurface>
  );
}
