// src/components/common/table.tsx
import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import cn from "@shared/lib/cn";

/* ===========================
   Типы колонок и пропсов
=========================== */

export type Column<T> = {
  key: keyof T | string;
  title: ReactNode;
  width?: number;
  headerProps?: HTMLAttributes<HTMLTableCellElement>;
  cellProps?: HTMLAttributes<HTMLTableCellElement>;
  render?: (row: T, index: number) => ReactNode;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  className?: string;
  tableProps?: React.TableHTMLAttributes<HTMLTableElement>;
};

/* ===========================
   Примитивы таблицы (named)
=========================== */

export const Table = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full overflow-hidden rounded-2xl border border-border/40 bg-card/80 text-sm text-fg shadow-soft", className)} {...p} />
);

export const THead = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-card/60", className)} {...p} />
);

export const TBody = (
  p: React.HTMLAttributes<HTMLTableSectionElement>
) => <tbody {...p} />;

export const Tr = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border/30 transition-colors hover:bg-card/70", className)} {...p} />
);

export const Th = ({
  className,
  ...p
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
      className
    )}
    {...p}
  />
);

export const Td = ({
  className,
  ...p
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle text-sm text-fg", className)} {...p} />
);

/* ===========================
   Универсальная таблица (default)
=========================== */

function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
  tableProps,
}: DataTableProps<T>) {
  return (
    <table className={cn("w-full overflow-hidden rounded-2xl border border-border/40 bg-card/80 text-sm text-fg shadow-soft", className)} {...tableProps}>
      {/* Ширины колонок */}
      {!!columns.length && (
        <colgroup>
          {columns.map((c, i) => {
            const width = typeof c.width === "number" ? Math.max(0, Math.min(512, Math.round(c.width))) : null;
            const widthClass = width != null ? `w-px-${width}` : undefined;
            return <col key={`col-${String(c.key)}-${i}`} className={widthClass} />;
          })}
        </colgroup>
      )}

      <thead className="bg-card/60">
        <tr>
          {columns.map((c, i) => (
            <th key={`h-${String(c.key)}-${i}`} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted" {...c.headerProps}>
              {c.title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((r, i) => (
          <tr key={rowKey(r, i)} className="border-b border-border/30 transition-colors hover:bg-card/70">
            {columns.map((c, j) => (
              <td key={`c-${String(c.key)}-${i}-${j}`} className="px-4 py-3 align-middle text-sm text-fg" {...c.cellProps}>
                {c.render ? c.render(r, i) : (r as any)[c.key as keyof T]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataTable;
