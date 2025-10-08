import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@ui/components/common/card";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (k: string, d: "asc" | "desc") => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (n: number) => void;
  onPageSizeChange?: (n: number) => void;
  onSelectionChange?: (ids: string[]) => void;
  rowId: (r: T) => string;
  density?: "comfortable" | "compact";
};

export default function DataTable<T>({ rows, columns, sortKey, sortDir = 'asc', onSortChange, page, pageSize, total, onPageChange, onPageSizeChange, onSelectionChange, rowId, density = 'comfortable' }: DataTableProps<T>) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setSelected([]);
    onSelectionChange?.([]);
  }, [rows, onSelectionChange]);
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  const [sorting, setSorting] = useState<SortingState>(sortKey ? [{ id: String(sortKey), desc: sortDir === 'desc' }] : []);
  useEffect(() => {
    setSorting(sortKey ? [{ id: String(sortKey), desc: sortDir === 'desc' }] : []);
  }, [sortKey, sortDir]);

  const toggleAll = (checked: boolean) => {
    const ids = checked ? rows.map(rowId) : [];
    setSelected(ids); onSelectionChange?.(ids);
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = checked ? [...new Set([...selected, id])] : selected.filter(x => x !== id);
    setSelected(next); onSelectionChange?.(next);
  };

  const tanColumns = useMemo<ColumnDef<T>[]>(() => columns.map((c) => ({
    id: String(c.key),
    header: () => (
      <button
        className={`inline-flex items-center gap-1 ${c.sortable? 'hover:underline':''}`}
        onClick={() => {
          if (!c.sortable) return;
          const k = String(c.key);
          const d = sortKey === k && sortDir === 'asc' ? 'desc' : 'asc';
          onSortChange?.(k, d);
        }}
      >
        {c.header}
        {c.sortable && sortKey === String(c.key) ? <span className="text-[10px]">{sortDir==='asc'?'▲':'▼'}</span> : null}
      </button>
    ),
    cell: ({ row }) => {
      const original = row.original as T;
      return c.render ? c.render(original) : (original as any)[c.key as any];
    },
    enableSorting: false, // sorting handled server-side via onSortChange
    size: c.width ? parseInt(c.width, 10) : undefined,
  })), [columns, onSortChange, sortDir, sortKey]);

  const table = useReactTable<T>({
    data: rows,
    columns: tanColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const thPad = density === 'compact' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const tdPad = density === 'compact' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <Card className="p-0">
      <div ref={scrollRef} className="max-h-[65vh] overflow-auto relative">
        <table className="min-w-full text-[var(--text)]">
          <thead className={`sticky top-0 z-10 bg-card/95 backdrop-blur ${scrolled ? 'shadow-sm' : ''} dark:bg-black/40`}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              <th className={`${thPad} w-[36px] text-left bg-transparent`}><input aria-label="Select all" type="checkbox" onChange={(e)=>toggleAll(e.currentTarget.checked)} checked={selected.length>0 && selected.length===rows.length} /></th>
              {hg.headers.map((h, i) => {
                const col = columns[i];
                const align = col?.align || 'left';
                const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
                return (
                <th key={h.id} className={`${thPad} whitespace-nowrap ${alignCls} bg-transparent`}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
                );
              })}
            </tr>
          ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className={`${tdPad} text-[var(--text-dim)]`} colSpan={columns.length+1}>No items.</td></tr>
            ) : table.getRowModel().rows.map((r) => {
              const id = rowId(r.original as T);
              return (
                <tr key={r.id} className="border-t border-border odd:bg-slate-50/60 hover:bg-slate-100 transition-colors dark:border-white/10 dark:odd:bg-white/[0.02] dark:hover:bg-white/5">
                  <td className={`${tdPad}`}><input aria-label="Select row" type="checkbox" checked={selected.includes(id)} onChange={(e)=>toggleOne(id, e.currentTarget.checked)} /></td>
                  {r.getVisibleCells().map((cell, i) => {
                    const col = columns[i];
                    const align = col?.align || 'left';
                    const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
                    return (
                      <td key={cell.id} className={`${tdPad} align-top ${alignCls}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-3 border-t border-border text-sm bg-card dark:border-white/10">
        <div>
          Page {page} of {pages}
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded border border-border bg-white px-2 py-1 text-sm shadow-sm disabled:opacity-50 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" onClick={()=>onPageChange(Math.max(1,page-1))} disabled={page<=1}>Prev</button>
          <button className="rounded border border-border bg-white px-2 py-1 text-sm shadow-sm disabled:opacity-50 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" onClick={()=>onPageChange(Math.min(pages,page+1))} disabled={page>=pages}>Next</button>
          {onPageSizeChange && (
            <select className="ml-2 rounded border border-border bg-white px-2 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/10 dark:border-white/10" value={pageSize} onChange={(e)=>onPageSizeChange?.(Number(e.target.value))}>
              {[10,25,50].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          )}
        </div>
      </div>
    </Card>
  );
}





