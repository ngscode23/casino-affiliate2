// src/components/common/table.tsx
import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import cn from "@/lib/cn";

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
  <table className={cn("table w-full", className)} {...p} />
);

export const THead = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-white/5", className)} {...p} />
);

export const TBody = (
  p: React.HTMLAttributes<HTMLTableSectionElement>
) => <tbody {...p} />;

export const Tr = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-white/5 transition-colors", className)} {...p} />
);

export const Th = ({
  className,
  ...p
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "text-left text-[13px] uppercase tracking-wide text-[var(--text-dim)]",
      "px-4 py-3",
      className
    )}
    {...p}
  />
);

export const Td = ({
  className,
  ...p
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("align-middle px-4 py-3", className)} {...p} />
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
    <table className={cn("table w-full", className)} {...tableProps}>
      {/* Ширины колонок */}
      {!!columns.length && (
        <colgroup>
          {columns.map((c, i) => (
            <col
              key={`col-${String(c.key)}-${i}`}
              style={c.width ? { width: `${c.width}px` } : undefined}
            />
          ))}
        </colgroup>
      )}

      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={`h-${String(c.key)}-${i}`} {...c.headerProps}>
              {c.title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((r, i) => (
          <tr key={rowKey(r, i)}>
            {columns.map((c, j) => (
              <td key={`c-${String(c.key)}-${i}-${j}`} {...c.cellProps}>
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