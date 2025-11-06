// src/builders/TableRenderer.tsx
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { VerticalConfig } from '@shared/verticals/types';
import { useVertical } from '@shared/ctx/VerticalContext';
import { fetchAttributeRegistry, fetchProductAttributes, toValueMap } from '@shared/lib/attributes';
import { supabase } from '@shared/lib/supabase';
import type { AttributeRegistryItem } from '@casino-affiliate/types';
import { t } from '@shared/lib/t';
import { Pill } from '@ui/components/ui/Pill';

export type ProductRef = { id: string; name?: string; slug?: string };

export type TableRendererProps = {
  vertical?: VerticalConfig;
  products: ProductRef[];
  /** optional override for columns; defaults to vertical.compare.columns */
  columns?: string[];
  maxPillsPerCell?: number; // for multi_enum
  className?: string;
};

export default function TableRenderer({ vertical: vOverride, products, columns, maxPillsPerCell = 3, className = '' }: TableRendererProps) {
  const vCtx = useVertical();
  const vertical = vOverride ?? vCtx;

  const [registry, setRegistry] = useState<AttributeRegistryItem[] | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, any>>>({});
  const [slugToId, setSlugToId] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    fetchAttributeRegistry().then((data) => {
      if (!active) return;
      setRegistry(data);
    });
    return () => { active = false; };
  }, []);

  const selectedColumns = useMemo(() => {
    const cols = (columns ?? (vertical.compare?.columns as unknown as string[]) ?? []).map(String);
    if (!registry) return cols;
    const meta = Object.fromEntries(registry.map((r) => [r.key, r] as const));
    return cols.filter((c) => meta[c]?.comparable === true);
  }, [columns, vertical.compare, registry]);

  useEffect(() => {
    (async () => {
      try {
        if (!registry || !products.length || !selectedColumns.length) return;
        const slugs = products.map((p) => p.slug || p.id).filter(Boolean) as string[];
        const { data, error } = await (supabase as any)
          .from('v_products_flat')
          .select('id,slug,title')
          .in('slug', slugs);
        if (error) throw error;
        const map: Record<string, string> = {};
        for (const row of (data as any[] || [])) {
          map[String(row.slug)] = String(row.id);
        }
        setSlugToId(map);
        const ids = Object.values(map);
        if (ids.length) {
          const rows = await fetchProductAttributes(ids as any, selectedColumns);
          setValues(toValueMap(rows));
        } else {
          setValues({});
        }
      } catch {
        setValues({});
      }
    })();
  }, [registry, products, selectedColumns]);

  // Skeleton while registry is loading to avoid flicker on Compare
  if (!registry) {
    const wanted = (columns ?? (vertical.compare?.columns as unknown as string[]) ?? []).map(String);
    return (
      <div className={className}>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-4 py-2 border-b border-white/10">{t('compare.selected') || 'Product'}</th>
                {wanted.map((k) => (
                  <th key={k} className="text-left px-4 py-2 border-b border-white/10">{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 font-semibold">{p.name || p.slug || p.id}</td>
                  {wanted.map((k) => (
                    <td key={k} className="px-4 py-2 text-[var(--muted)]">…</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  const meta = Object.fromEntries(registry.map((r) => [r.key, r] as const));

  function prettyLabel(key: string): string {
    const m = meta[key];
    const lk = m?.label_key;
    const translated = t(lk || key);
    const looksLikeKey = !translated || translated === lk || translated.includes('.') || translated === key;
    if (!looksLikeKey) return translated;
    const base = (key.includes('.') ? key.split('.').pop()! : key)
      .replace(/_/g, ' ')
      .trim();
    const title = base.charAt(0).toUpperCase() + base.slice(1);
    // small curated aliases
    if (key === 'payout_time_hours') return 'Payout (h)';
    if (key === 'compliance_license') return 'License';
    if (key === 'payout_methods') return 'Methods';
    if (key === 'rating') return 'Rating';
    return title;
  }

  return (
    <div className={className}>
      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-4 py-2 border-b border-white/10">{t('compare.selected') || 'Product'}</th>
              {selectedColumns.map((k) => (
                <th key={k} className="text-left px-4 py-2 border-b border-white/10">{prettyLabel(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 font-semibold">{p.name || p.slug || p.id}</td>
                {selectedColumns.map((k) => (
                  <td key={k} className="px-4 py-2 align-middle">
                    <Cell
                      type={meta[k]?.type || 'text'}
                      unit={meta[k]?.unit || undefined}
                      value={(values[String(slugToId[p.slug || p.id] ?? '')] ?? {})[k]}
                      keyName={k}
                      maxPills={maxPillsPerCell}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Named export for smoke check and ergonomic imports
export { TableRenderer };

function Cell({ type, value, unit, keyName, maxPills = 3 }: { type: string; value: any; unit?: string; keyName: string; maxPills?: number }) {
  if (value == null) return <span className="text-[var(--muted)]">—</span>;
  if (type === 'bool') {
    const v = !!value;
    return <Pill tone={v ? 'ok' : 'warn'}>{v ? '✓' : '–'}</Pill>;
  }
  if (type === 'number') {
    const n = Number(value);
    const txt = Number.isFinite(n) ? String(n) : String(value);
    return <span>{unit ? `${txt} ${unit}` : txt}</span>;
  }
  if (type === 'enum') {
    const lbl = t(`attributes.${keyName}.options.${String(value)}`);
    return <Pill>{lbl}</Pill>;
  }
  if (type === 'multi_enum') {
    const arr: string[] = Array.isArray(value) ? value.map(String) : [String(value)];
    const shown = arr.slice(0, maxPills);
    const rest = arr.length - shown.length;
    return (
      <div className="flex flex-wrap gap-2">
        {shown.map((v, i) => (
          <Pill key={`${v}-${i}`}>{t(`attributes.${keyName}.options.${v}`)}</Pill>
        ))}
        {rest > 0 ? <Pill>{`+${rest}`}</Pill> : null}
      </div>
    );
  }
  // text or fallback
  return <span>{String(value)}</span>;
}

