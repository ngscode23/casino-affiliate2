"use client";

import Link from "next/link";

type AccountOrdersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AccountOrdersError({ error, reset }: AccountOrdersErrorProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        ?? ??????? ??????? ?????????? ???????.
      </h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        {error?.message || "????????? ?? ???????? ????????. ?????????? ?????? ??? ?????? ???????."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          ?????????? ??????
        </button>
        <Link
          href="/account"
          className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
        >
          ? ????? ?? ?????????
        </Link>
      </div>
    </div>
  );
}

