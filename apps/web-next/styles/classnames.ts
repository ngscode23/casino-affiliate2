// Shared Tailwind class name presets for common typography/layout patterns.
// These are used by jscodeshift codemods to replace hard‑coded class strings
// and can also be imported directly in components.

export const overlineLight =
  "text-xs uppercase tracking-[0.3em] text-slate-500";

export const overlineDark =
  "text-xs uppercase tracking-widest text-white/40";

export const adminFieldLabel =
  "text-sm font-medium text-admin-text";

export const mutedTextXs =
  "text-xs text-muted-foreground";

export const mutedTextSm =
  "text-sm text-muted-foreground";

// Legacy pattern that still uses `text-muted` instead of `text-muted-foreground`.
// Kept separate so it can be migrated or removed later.
export const mutedTextSmLegacy =
  "text-sm text-muted";

export const sectionTitle =
  "text-xl font-semibold text-fg";

export const labelTextSm =
  "mb-1 block text-sm";

export const iconSm =
  "h-4 w-4";

export const headingLgOnDark =
  "text-lg font-semibold text-white";

