// src/features/offers/api/getOffersPaged.ts
import { supabase } from '@shared/lib/supabase';
import { offersNormalized, type NormalizedOffer } from '@shared/lib/offers';
import { HAS_SUPABASE } from '@shared/config';

type PagedResult = { items: NormalizedOffer[]; total: number };

// normalizeRow was inlined and is no longer needed

export async function getOffersPaged(filters: Record<string, any>, opts: { limit: number; offset: number }): Promise<PagedResult> {
  const { limit, offset } = opts;
  // Fallback to local data when Supabase is disabled or unreachable
  const applyLocal = (): PagedResult => {
    const license = filters?.license;
    const qStr = String(filters?.q ?? '').trim().toLowerCase();
    let arr = [...offersNormalized];
    if (license && license !== 'all') arr = arr.filter((o) => String(o.license) === String(license));
    if (qStr) {
      arr = arr.filter((o) => {
        const hay = [o.name, o.license, ...(o.methods ?? [])].join(' ').toLowerCase();
        return hay.includes(qStr);
      });
    }
    // apply sort locally
    const sortRaw = String(filters?.sort || 'rating');
    const dirRaw  = (filters?.dir === 'asc' || filters?.dir === 'desc') ? (filters.dir as 'asc'|'desc') : 'desc';
    const sortKey: 'rating' | 'payoutHours' | 'name' = (sortRaw === 'payoutHours' || sortRaw === 'name') ? (sortRaw as any) : 'rating';
    arr.sort((a, b) => {
      let av: any;
      let bv: any;
      if (sortKey === 'name') { av = String(a.name || ''); bv = String(b.name || ''); return dirRaw === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
      if (sortKey === 'payoutHours') { av = Number(a.payoutHours ?? Number.POSITIVE_INFINITY); bv = Number(b.payoutHours ?? Number.POSITIVE_INFINITY); return dirRaw === 'asc' ? av - bv : bv - av; }
      av = Number(a.rating ?? 0); bv = Number(b.rating ?? 0); return dirRaw === 'asc' ? av - bv : bv - av;
    });
    const total = arr.length;
    const items = arr.slice(offset, offset + limit);
    return { items, total };
  };

  if (!HAS_SUPABASE) {
    return applyLocal();
  }

  try {
    // Query the flattened view to avoid joining client-side
    let q = supabase
      .from('v_products_flat')
      .select('slug,name,rating,compliance_license,payout_time_hours,payout_methods', { count: 'exact' });

    const licenseFilter = (filters?.compliance_license || filters?.license) as string | string[] | undefined;
    if (Array.isArray(licenseFilter) && licenseFilter.length) {
      q = (q as any).in('compliance_license', licenseFilter);
    } else if (typeof licenseFilter === 'string' && licenseFilter && licenseFilter !== 'all') {
      q = q.eq('compliance_license', licenseFilter);
    }
    const qStr = String(filters?.q ?? '').trim();
    if (qStr) {
      const pat = `%${qStr}%`;
      q = q.or(`name.ilike.${pat},slug.ilike.${pat}`);
    }
    // number range filter: payout_time_hours
    const hours = filters?.payout_time_hours as { min?: number; max?: number } | undefined;
    if (hours && (Number.isFinite(hours.min as any) || Number.isFinite(hours.max as any))) {
      if (Number.isFinite(hours.min as any)) q = q.gte('payout_time_hours', Number(hours.min));
      if (Number.isFinite(hours.max as any)) q = q.lte('payout_time_hours', Number(hours.max));
    }
    // number range filter: rating
    const rating = filters?.rating as { min?: number; max?: number } | undefined;
    if (rating && (Number.isFinite(rating.min as any) || Number.isFinite(rating.max as any))) {
      if (Number.isFinite(rating.min as any)) q = q.gte('rating', Number(rating.min));
      if (Number.isFinite(rating.max as any)) q = q.lte('rating', Number(rating.max));
    }
    // multi_enum: payout_methods any-of
    const methods = Array.isArray(filters?.payout_methods) ? (filters?.payout_methods as string[]) : [];
    if (methods.length) {
      q = (q as any).overlaps('payout_methods', methods);
    }

    // sorting
    const sortRaw = String(filters?.sort || 'rating');
    const dirRaw  = (filters?.dir === 'asc' || filters?.dir === 'desc') ? (filters.dir as 'asc'|'desc') : 'desc';
    const col = sortRaw === 'payoutHours' ? 'payout_time_hours' : sortRaw === 'name' ? 'name' : 'rating';
    q = q.order(col as any, { ascending: dirRaw === 'asc' });
    // stable tie-breakers
    if (col !== 'name') q = q.order('name', { ascending: true });
    q = q.order('slug', { ascending: true });

    q = q.range(offset, Math.max(offset, offset + limit - 1));

    const { data, count, error } = await q;
    if (error) throw error;
    const items = (data ?? []).map((r: any) => {
      // map view row to NormalizedOffer
      const lic = String(r.compliance_license ?? '').toLowerCase();
      const license = lic === 'mga' ? 'MGA' : lic === 'ukgc' ? 'UKGC' : lic === 'curacao' ? 'Curaçao' : lic ? 'Other' : 'Other';
      const o: NormalizedOffer = {
        slug: String(r.slug),
        name: String(r.name),
        rating: typeof r.rating === 'number' ? r.rating : Number(r.rating ?? 0),
        license,
        payout: '',
        payoutHours: r.payout_time_hours ?? undefined,
        methods: Array.isArray(r.payout_methods) ? (r.payout_methods as string[]) : [],
        link: undefined,
        enabled: true,
        position: undefined,
      } as NormalizedOffer;
      return o;
    });
    return { items, total: count ?? items.length };
  } catch {
    // fallback on any error
    return applyLocal();
  }
}

export default getOffersPaged;

