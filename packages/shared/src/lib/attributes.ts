// src/lib/attributes.ts
import { supabase } from '@shared/lib/supabase';
import type { AttributeRegistryItem, AttributeValueMap, ProductAttributeRow } from '@casino-affiliate/types';

export async function fetchAttributeRegistry(): Promise<AttributeRegistryItem[]> {
  const { data, error } = await supabase
    .from('attributes_registry')
    .select('*')
    .order('key', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttributeRegistryItem[];
}

export async function fetchProductAttributes(productIds?: (string | number)[], keys?: string[]): Promise<ProductAttributeRow[]> {
  let q = supabase.from('product_attributes').select('product_id,key,value');
  if (productIds && productIds.length) {
    q = (q as any).in('product_id', productIds as any);
  }
  if (keys && keys.length) q = q.in('key', keys);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ProductAttributeRow[];
}

export function toValueMap(rows: ProductAttributeRow[]): AttributeValueMap {
  const out: AttributeValueMap = {};
  for (const r of rows) {
    const pid = String((r as any).product_id);
    if (!out[pid]) out[pid] = {};
    out[pid][(r as any).key] = (r as any).value;
  }
  return out;
}

export function distinctOptionsFromRows(rows: ProductAttributeRow[], type: 'enum' | 'multi_enum'): Record<string, string[]> {
  const result: Record<string, Set<string>> = {};
  for (const r of rows) {
    const set = (result[r.key] ||= new Set<string>());
    const v = r.value;
    if (type === 'enum') {
      if (typeof v === 'string') set.add(v);
      else if (v != null) set.add(String(v));
    } else {
      const arr: any[] = Array.isArray(v) ? v : v == null ? [] : [v];
      for (const x of arr) set.add(String(x));
    }
  }
  return Object.fromEntries(Object.entries(result).map(([k, s]) => [k, Array.from(s.values())]));
}

