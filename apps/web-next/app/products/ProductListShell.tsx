import type { ReactNode } from "react";

type Props = {
  theme: "light" | "dark";
  isFilterOpen: boolean;
  filterSidebar: ReactNode;
  onCloseFilters: () => void;
  toolbar: ReactNode;
  children: ReactNode;
};

export function ProductListShell({ theme, isFilterOpen, filterSidebar, onCloseFilters, toolbar, children }: Props) {
  return (
    <div
      data-theme={theme}
      className={
        theme === "dark"
          ? "relative min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#0f1324] to-[#0b101a] text-slate-100"
          : "relative min-h-screen bg-white text-gray-900"
      }
    >
      {theme === "dark" ? (
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(80,200,255,0.14),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(140,122,255,0.18),transparent_30%),radial-gradient(circle_at_35%_70%,rgba(93,247,185,0.12),transparent_28%)]" />
      ) : null}

      <div
        className={
          theme === "dark"
            ? "sticky top-0 z-40 border-b border-white/10 bg-[#0d111b]/80 backdrop-blur-xl"
            : "sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur"
        }
      >
        {toolbar}
      </div>

      <div className="mx-auto flex w-full gap-6 px-4 py-10 sm:px-8 lg:px-12">
        {isFilterOpen ? <div className="hidden lg:block lg:w-[280px] lg:flex-none">{filterSidebar}</div> : null}
        <section className="flex-1 min-w-0 space-y-10">{children}</section>
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="h-full w-[85vw] max-w-xs bg-white shadow-2xl">{filterSidebar}</div>
          <button type="button" onClick={onCloseFilters} className="h-full flex-1" aria-label="Close filters" />
        </div>
      ) : null}
    </div>
  );
}
