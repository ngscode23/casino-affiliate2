export type BrandingTokens = {
  primary: string; // CSS color or var — applied to --brand
  primaryFg?: string; // applied to --brand-fg
};

export type VerticalConfig = {
  key: string;
  branding: BrandingTokens;
  disclosures?: {
    footer?: string; // i18n key
    card?: string;   // i18n key
  };
  list: {
    visibleFields: Array<'license' | 'methods' | 'payout' | 'rating'>;
    pills?: Array<'license' | 'methods'>;
    cta?: { labelKey: string };
  };
  compare: {
    columns: Array<'rating' | 'payoutHours' | 'license' | 'methods'>;
    defaultSort: { key: 'rating' | 'payoutHours'; dir: 'asc' | 'desc' };
  };
  filters: Array<{ key: string; type: 'text' | 'enum' | 'multi_enum' | 'number' | 'bool' }>;
};


