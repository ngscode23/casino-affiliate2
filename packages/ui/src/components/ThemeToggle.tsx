"use client";

import * as React from "react";

const STORAGE_KEY = "storefront-theme";

function getInitial(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  } catch {
    // ignore storage access issues
  }
  return "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const hasMountedRef = React.useRef(false);

  React.useEffect(() => {
    try {
      localStorage.removeItem("theme");
    } catch {
      /* ignore */
    }
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
        localStorage.setItem(STORAGE_KEY, mode);
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
        "inline-flex items-center justify-center rounded-full border border-border/40 bg-card/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted transition-colors",
        "hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className,
      ].join(" ")}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "dark" ? "Light theme" : "Dark theme"}
    >
      {nextMode === "dark" ? "Dark" : "Light"}
    </button>
  );
}
