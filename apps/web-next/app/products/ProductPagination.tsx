type Props = {
  theme: "light" | "dark";
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore?: () => void;
};

export function ProductPagination({ theme, hasMore, isLoading, onLoadMore }: Props) {
  if (!hasMore) return null;
  const baseClass =
    theme === "dark"
      ? "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-100 shadow hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19]"
      : "inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:border-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  return (
    <div className="py-6 text-center">
      <button
        type="button"
        disabled={isLoading}
        onClick={onLoadMore}
        className={`${baseClass} ${isLoading ? "opacity-70" : ""}`}
      >
        {isLoading ? "Loading more products..." : "Load more products"}
      </button>
    </div>
  );
}
