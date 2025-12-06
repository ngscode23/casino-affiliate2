"use client";

import { useEffect } from "react";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[product] failed to render", error);
  }, [error]);

  return (
    <div className="bg-background">
      <div
        role="alert"
        aria-live="assertive"
        className="mx-auto max-w-screen-md px-6 py-12 sm:px-8 lg:px-10"
      >
        <div className="space-y-4 rounded-3xl border border-amber-200/60 bg-amber-50/80 p-6 text-amber-900 shadow-[0_18px_50px_-35px_rgba(234,179,8,0.45)] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50">
          <div className="flex items-center justify-between gap-4">
            <p className="text-lg font-semibold">?? ????????? ???????</p>
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(251,191,36,0.24)]" />
          </div>
          <p className="text-sm opacity-80">
            {error?.message || "?????????? ?????? ?????????????. ??????????? ????????."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(234,179,8,0.35)] transition hover:-translate-y-[1px]"
            >
              ???????????
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.assign("/products");
                }
              }}
              className="inline-flex items-center rounded-full border border-amber-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:-translate-y-[1px] hover:bg-white"
            >
              ??????? ? ???????
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
