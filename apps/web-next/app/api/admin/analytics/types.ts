export type AnalyticsRangePreset = "7" | "30" | "90" | "custom";

export interface AnalyticsFiltersQuery {
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
  slug?: string | string[];
  utm_source?: string | string[];
  utm_campaign?: string | string[];
  device?: string | string[];
  lang?: string | string[];
  referrer_host?: string | string[];
  limit?: string;
  compare?: string;
}

export interface AnalyticsDayPoint {
  date: string;
  count: number;
}

export interface AnalyticsSlugEntry {
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
  paid?: number;
  cr?: number;
  revenue?: Record<string, number>;
  revenueTotal?: number;
  avgOrderValue?: number | null;
}

export interface AnalyticsSourceEntry {
  source: string;
  count: number;
  paid?: number;
  cr?: number;
  revenue?: Record<string, number>;
  revenueTotal?: number;
  avgOrderValue?: number | null;
}

export interface AnalyticsUtmEntry {
  source: string;
  campaign: string;
  count: number;
}

export interface AnalyticsBreakdownEntry {
  device?: string;
  lang?: string;
  count: number;
}

export interface AnalyticsKpi {
  revenueByCurrency: Record<string, number>;
  refundsByCurrency: Record<string, number>;
  netByCurrency: Record<string, number>;
}

export interface AnalyticsFunnel {
  impressions: number;
  clicks: number;
  payment_attempts: number;
  paid: number;
}

export interface AnalyticsDiffBlock {
  clicks: number;
  impressions: number;
  paid: number;
  revenue: Record<string, number>;
  cr: number;
  aov: number;
}

export interface AnalyticsCompareBlock {
  rangePrev: { from: string; to: string };
  kpiPrev: AnalyticsKpi;
  funnelPrev: AnalyticsFunnel;
  diffAbs: AnalyticsDiffBlock;
  diffPct: AnalyticsDiffBlock;
}

export interface AnalyticsSnapshot {
  range: { from: string; to: string };
  totals: { clicks: number; impressions: number };
  byDay: {
    clicks: AnalyticsDayPoint[];
    impressions: AnalyticsDayPoint[];
  };
  topSlugs: AnalyticsSlugEntry[];
  sparkline: Record<string, AnalyticsDayPoint[]>;
  topSources: AnalyticsSourceEntry[];
  utm: AnalyticsUtmEntry[];
  devices: Array<{ device: string; count: number }>;
  languages: Array<{ lang: string; count: number }>;
  kpi?: AnalyticsKpi;
  funnel?: AnalyticsFunnel;
  compare?: AnalyticsCompareBlock;
  meta: {
    limit: number;
    generatedAt: string;
    filters?: Record<string, string[]>;
    fallback?: {
      conversions: boolean;
    };
  };
}
