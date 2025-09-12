// src/builders/FiltersBuilder.tsx
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useVertical } from '@/ctx/VerticalContext';
import type { VerticalConfig } from '@/verticals/types';
import { fetchAttributeRegistry, fetchProductAttributes, distinctOptionsFromRows } from '@/lib/attributes';
import type { AttributeRegistryItem } from '@/types/attributes';
import Input from '@/components/common/input';
import Button from '@/components/common/button';
import { t } from '@/lib/t';

export type FiltersBuilderProps = {
  vertical?: VerticalConfig;
  onChange?: (values: Record<string, any>) => void;
  initial?: Record<string, any>;
  /** Optional subset of product IDs to derive available options for enum/multi_enum */
  productIds?: string[];
  className?: string;
  /**
   * Which set of attributes to render:
   * - 'vertical' (default): only keys listed in vertical.filters and facetable in registry
   * - 'all': all facetable attributes from registry
  */
  mode?: 'vertical' | 'all';
  /** Optional preloaded registry to avoid duplicate fetch */
  registry?: AttributeRegistryItem[];
};

type Option = { value: string; label: string };

export default function FiltersBuilder({ vertical: vOverride, onChange, initial, productIds, className = '', mode = 'vertical', registry: registryProp }: FiltersBuilderProps) {
  const vCtx = useVertical();
  const vertical = vOverride ?? vCtx;

  const [registry, setRegistry] = useState<AttributeRegistryItem[] | null>(registryProp ?? null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(initial ?? {});
  const [options, setOptions] = useState<Record<string, Option[]>>({});

  // load registry
  useEffect(() => {
    let active = true;
    if (registryProp) { setRegistry(registryProp); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    fetchAttributeRegistry()
      .then((data) => { if (!active) return; setRegistry(data); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [registryProp]);

  // derive enum/multi_enum options from product_attributes
  useEffect(() => {
    (async () => {
      if (!registry) return;
      const facetKeys = new Set((vertical.filters ?? []).map((f: any) => (typeof f === 'string' ? f : f.key)));
      const enums = registry.filter((r) => r.facetable && facetKeys.has(r.key) && (r.type === 'enum' || r.type === 'multi_enum'));
      if (!enums.length) return;
      const keys = enums.map((e) => e.key);
      const rows = await fetchProductAttributes(productIds, keys).catch(async () => {
        // fallback: load across all products if specific subset is not accessible
        return await fetchProductAttributes(undefined, keys);
      });
      // For options we need both enum and multi_enum extracted together
      const optMap: Record<string, string[]> = {
        ...distinctOptionsFromRows(rows, 'enum'),
        ...distinctOptionsFromRows(rows, 'multi_enum'),
      };
      const out: Record<string, Option[]> = {};
      for (const r of enums) {
        const list = optMap[r.key] ?? [];
        out[r.key] = list
          .sort((a, b) => String(a).localeCompare(String(b)))
          .map((val) => ({ value: val, label: t(`attributes.${r.key}.options.${val}`) }));
      }
      setOptions(out);
    })();
  }, [registry, productIds, vertical.filters]);

  const facetsToRender = useMemo(() => {
    if (!registry) return [] as AttributeRegistryItem[];
    if (mode === 'all') return registry.filter((r) => r.facetable);
    const facetKeys = new Set((vertical.filters ?? []).map((f: any) => (typeof f === 'string' ? f : f.key)));
    return registry.filter((r) => r.facetable && facetKeys.has(r.key));
  }, [registry, vertical.filters, mode]);

  function setValue(key: string, val: any) {
    const next = { ...values, [key]: val };
    setValues(next);
    onChange?.(next);
  }

  if (loading && !registry) {
    return <div className={className}>Loading filters…</div>;
  }

  if (!registry) return null;

  return (
    <div className={["grid gap-3", className].join(' ')}>
      {facetsToRender.map((f) => {
        const tval = t(f.label_key);
        const human = (!tval || tval === f.label_key || tval.includes('.'))
          ? (() => {
              const base = (f.key.includes('.') ? f.key.split('.').pop()! : f.key).replace(/_/g, ' ');
              if (f.key === 'payout_time_hours') return 'Payout (h)';
              if (f.key === 'compliance_license') return 'License';
              if (f.key === 'payout_methods') return 'Methods';
              if (f.key === 'rating') return 'Rating';
              return base.charAt(0).toUpperCase() + base.slice(1);
            })()
          : tval;
        const label = human;
        const val = values[f.key];
        if (f.type === 'text') {
          return (
            <label key={f.key} className="block">
              <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
              <Input value={val ?? ''} onChange={(e) => setValue(f.key, e.target.value)} placeholder={t('filters.searchPlaceholder')} />
            </label>
          );
        }
        if (f.type === 'number') {
          const from = (val?.min ?? '') as string;
          const to = (val?.max ?? '') as string;
          return (
            <div key={f.key}>
              <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
              <div className="flex items-center gap-2">
                <Input type="number" inputMode="numeric" value={from} onChange={(e) => setValue(f.key, { ...val, min: e.target.value })} placeholder={t('filters.min') || 'min'} />
                <span className="text-[var(--muted)]">—</span>
                <Input type="number" inputMode="numeric" value={to} onChange={(e) => setValue(f.key, { ...val, max: e.target.value })} placeholder={t('filters.max') || 'max'} />
                {f.unit ? <span className="text-[var(--muted)]">{f.unit}</span> : null}
              </div>
            </div>
          );
        }
        if (f.type === 'bool') {
          const checked = Boolean(val);
          return (
            <label key={f.key} className="inline-flex items-center gap-2 select-none">
              <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40" checked={checked} onChange={(e) => setValue(f.key, e.target.checked)} />
              <span>{label}</span>
            </label>
          );
        }
        if (f.type === 'enum') {
          const opts = options[f.key] ?? [];
          const selected = (val ?? '') as string;
          return (
            <label key={f.key} className="block">
              <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
              <select
                className="w-full h-11 rounded-xl px-3 bg-[rgb(var(--bg-2)/.9)] border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                value={selected}
                onChange={(e) => setValue(f.key, e.target.value)}
              >
                <option value="">{t('filters.all')}</option>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (f.type === 'multi_enum') {
          const opts = options[f.key] ?? [];
          const selected: string[] = Array.isArray(val) ? val : [];
          return (
            <fieldset key={f.key} className="block">
              <legend className="text-xs text-[var(--muted)] mb-1">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const isOn = selected.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className={[
                        'px-3 py-1 rounded-xl text-sm border',
                        isOn ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10 hover:bg-white/5',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
                      ].join(' ')}
                      aria-pressed={isOn}
                      onClick={() => {
                        const next = isOn ? selected.filter((x) => x !== o.value) : [...selected, o.value];
                        setValue(f.key, next);
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        }
        return null;
      })}

      {/* Controls */}
      <div className="mt-2 flex items-center gap-2">
        <Button variant="ghost" onClick={() => { setValues({}); onChange?.({}); }}>{t('compare.clear') || 'Clear'}</Button>
        <Button onClick={() => onChange?.(values)}>{t('compare.open') || 'Apply'}</Button>
      </div>
    </div>
  );
}

// Named export for smoke check and ergonomic imports
export { FiltersBuilder };
