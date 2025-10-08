"use client";

export default function ShowcaseNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        Showcase
      </p>
      <h2 className="text-2xl font-semibold text-fg sm:text-3xl">
        Nothing to see here
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This demo route mirrors the former Vite client prototype. The page you
        requested was not found.
      </p>
    </div>
  );
}
