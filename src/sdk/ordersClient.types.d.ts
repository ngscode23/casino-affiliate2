// Minimal structural PostgrestFilterBuilder to avoid optional peer type resolution on CI
export type PostgrestFilterBuilder<Row = any> = {
  then?: any; // allow awaiting the builder and getting a typed response
  error?: any; data?: Row[] | null; count?: number | null; // mimic minimal PostgrestSingleResponse

  select(columns?: string): PostgrestFilterBuilder<Row>;
  eq(column: string, value: any): PostgrestFilterBuilder<Row>;
  gte(column: string, value: any): PostgrestFilterBuilder<Row>;
  lte(column: string, value: any): PostgrestFilterBuilder<Row>;
  in(column: string, values: any[]): PostgrestFilterBuilder<Row>;
  order(column: string, opts?: { ascending?: boolean }): PostgrestFilterBuilder<Row>;
  limit(n: number): PostgrestFilterBuilder<Row>;
  or(filter: string): PostgrestFilterBuilder<Row>;
};
