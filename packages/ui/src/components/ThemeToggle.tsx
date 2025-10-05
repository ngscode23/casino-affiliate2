"use client";

import * as React from "react";

function getInitial(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  } catch {
    // ignore storage access issues
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const hasMountedRef = React.useRef(false);

  React.useEffect(() => {
    const initial = getInitial();
    setMode(initial);
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (hasMountedRef.current) {
      try {
        localStorage.setItem("theme", mode);
      } catch {
        // ignore storage failures
      }
    } else {
      hasMountedRef.current = true;
    }
  }, [mode]);

  const nextMode = mode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setMode((value) => (value === "dark" ? "light" : "dark"))}
      className={[
        "inline-flex items-center justify-center rounded-md border border-border bg-card px-2 py-1 text-sm",
        "hover:bg-white/60 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]",
        className,
      ].join(" ")}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "dark" ? "Light theme" : "Dark theme"}
    >
      {nextMode === "dark" ? "Dark" : "Light"}
    </button>
  );
}
