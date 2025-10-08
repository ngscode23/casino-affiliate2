
export {};

declare global {
  interface ImportMeta {
    readonly env?: Record<string, unknown>;
  }
}
