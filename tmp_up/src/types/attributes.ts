// src/types/attributes.ts

export type AttributeType = 'text' | 'number' | 'bool' | 'enum' | 'multi_enum';

export type AttributeRegistryItem = {
  key: string;
  label_key: string; // i18n key
  type: AttributeType;
  comparable: boolean;
  facetable: boolean;
  unit?: string | null;
  sort_default?: number | null;
};

export type ProductAttributeRow = {
  product_id: string; // uuid
  key: string;
  value: any; // jsonb
};

export type AttributeValueMap = Record<string /* product_id */, Record<string /* key */, any>>;

