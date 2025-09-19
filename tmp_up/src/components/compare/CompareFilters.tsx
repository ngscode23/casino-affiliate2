// src/components/CompareFilters.tsx
import * as React from "react";
import { ButtonPrimary, ButtonGhost } from "@/components/ui/Buttons";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/common/sheet";
import { Filter as FilterIcon } from "lucide-react";
import { useT } from "@/lib/useT";
// src/components/CompareFilters.tsx



/** Единый источник правды для фильтров — СНАЧАЛА типы, потом всё остальное */
export const LICENSES = ["all", "MGA", "UKGC", "Curaçao", "Other"] as const;
export type LicenseFilter = typeof LICENSES[number];

export const METHODS = ["all", "Cards", "SEPA", "Crypto", "Paypal", "Skrill"] as const;
export type MethodFilter = typeof METHODS[number];

type Props = {
  total: number;
  filteredCount: number;

  // controlled-пропсы из родителя
  license: LicenseFilter;
  method: MethodFilter;
  search: string;

  // коллбэки наверх
  onChange: (v: { license: LicenseFilter; method: MethodFilter }) => void;
  onSearchChange: (value: string) => void;
};

const LICENSE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "MGA", value: "MGA" },
  { label: "UKGC", value: "UKGC" },
  { label: "Curaçao", value: "Curaçao" },
  { label: "Other", value: "Other" }
];

const METHOD_OPTIONS: { label: string; value: MethodFilter }[] = [
  { label: "All methods", value: "all" },
  { label: "Cards",       value: "Cards" },
  { label: "SEPA",        value: "SEPA" },
  { label: "Crypto",      value: "Crypto" },
  { label: "Paypal",      value: "Paypal" },
  { label: "Skrill",      value: "Skrill" },
];

export default function CompareFilters({
  total,
  filteredCount,
  license,
  method,
  search,
  onChange,
  onSearchChange,
}: Props) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  // локальный драфт для Apply/Reset
  const [draftLicense, setDraftLicense] = React.useState<LicenseFilter>(license);
  const [draftMethod,  setDraftMethod]  = React.useState<MethodFilter>(method);
  const [draftSearch,  setDraftSearch]  = React.useState<string>(search);

  React.useEffect(() => { setDraftLicense(license); }, [license]);
  React.useEffect(() => { setDraftMethod(method);   }, [method]);
  React.useEffect(() => { setDraftSearch(search);   }, [search]);

  const apply = React.useCallback(() => {
    onChange({ license: draftLicense, method: draftMethod });
    onSearchChange(draftSearch);
    setOpen(false);
  }, [draftLicense, draftMethod, onChange]);

  const reset = React.useCallback(() => {
    setDraftLicense("all");
    setDraftMethod("all");
    setDraftSearch("");
    onChange({ license: "all", method: "all" });
    onSearchChange("");
  }, [onChange, onSearchChange]);

  const activeCount = (license !== "all" ? 1 : 0) + (method !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <>
      {/* Mobile top bar: badge + Filters button (opens sheet) */}
      <div className="md:hidden flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-[var(--text-dim)]">
          <span className="badge">{filteredCount} / {total}</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10">
              <FilterIcon className="h-4 w-4" aria-hidden />
              {(t("filters.title") || "Filters")}{activeCount ? ` (${activeCount})` : ""}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" aria-label={t("filters.title") || "Filters"}>
            <SheetHeader>
              <SheetTitle>{t("filters.title") || "Filters"}</SheetTitle>
            </SheetHeader>

            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="sr-only">{t("filters.search") || "Search"}</span>
                <input
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
                  placeholder={t("filters.searchPlaceholder") || "Search casinos, licenses, methods…"}
                  value={draftSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftSearch(e.target.value)}
                  aria-label={t("filters.search") || "Search"}
                />
              </label>

              <label className="block">
                <span className="sr-only">{t("offer.license") || "License"}</span>
                <select
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
                  value={draftLicense}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDraftLicense(e.target.value as LicenseFilter)}
                  aria-label={(t("offer.license") || "License") + " filter"}
                >
                  {LICENSE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value === "all" ? (t("filters.all") || "All") : opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">{t("filters.methods") || "Payment method"}</span>
                <select
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
                  value={draftMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDraftMethod(e.target.value as MethodFilter)}
                  aria-label={(t("filters.methods") || "Methods") + " filter"}
                >
                  {METHOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value === "all" ? (t("filters.all") || "All") : opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <SheetFooter>
              <div className="flex gap-2">
                <ButtonGhost onClick={reset} aria-label={(t("filters.reset") || "Reset") + " filters"}>{t("filters.reset") || "Reset"}</ButtonGhost>
                <ButtonPrimary onClick={apply} aria-label={(t("filters.apply") || "Apply") + " filters"}>{t("filters.apply") || "Apply"}</ButtonPrimary>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop controls inline */}
      <div className="hidden md:flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center">
        {/* Счётчик */}
        <div className="text-sm text-[var(--text-dim)]"><span className="badge">{filteredCount} / {total}</span></div>

        {/* Поиск + селекты */}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:max-w-3xl">
          {/* Поиск */}
          <label className="block">
            <span className="sr-only">{t("filters.search") || "Search"}</span>
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
              placeholder={t("filters.searchPlaceholder") || "Search casinos, licenses, methods…"}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              aria-label={t("filters.search") || "Search"}
            />
          </label>

          {/* License */}
          <label className="block">
            <span className="sr-only">{t("offer.license") || "License"}</span>
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
              value={license}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({ license: e.target.value as LicenseFilter, method })
              }
              aria-label={(t("offer.license") || "License") + " filter"}
            >
              {LICENSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === "all" ? (t("filters.all") || "All") : opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Method */}
          <label className="block">
            <span className="sr-only">{t("filters.methods") || "Payment method"}</span>
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-full"
              value={method}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({ license, method: e.target.value as MethodFilter })
              }
              aria-label={(t("filters.methods") || "Methods") + " filter"}
            >
              {METHOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === "all" ? (t("filters.all") || "All") : opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Кнопки */}
        <div className="md:ml-auto btn-row">
          <ButtonGhost onClick={reset} aria-label={(t("filters.reset") || "Reset") + " filters"}>{t("filters.reset") || "Reset"}</ButtonGhost>
          <ButtonPrimary onClick={apply} aria-label={(t("filters.apply") || "Apply") + " filters"}>{t("filters.apply") || "Apply"}</ButtonPrimary>
        </div>
      </div>
    </>
  );
}



