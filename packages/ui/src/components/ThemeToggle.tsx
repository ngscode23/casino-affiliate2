"use client";

import * as React from "react";

type ThemeMode = "light" | "dark" | "noir";

const THEME_ORDER: ThemeMode[] = ["light", "dark", "noir"];
const THEME_LABEL: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  noir: "Noir",
};

function getInitial(): ThemeMode {
  if (typeof window === "undefined") {
    return "noir";
  }

  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "noir") {
      return saved;
    }
  } catch {
    // ignore inaccessible storage
  }

  const root = document.documentElement;
  if (root.classList.contains("theme-noir")) return "noir";
  if (root.classList.contains("dark")) return "dark";

  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = React.useState<ThemeMode>("noir");
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
    root.classList.remove("dark", "theme-noir");

    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "noir") {
      root.classList.add("theme-noir");
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

  const currentIndex = THEME_ORDER.indexOf(mode);
  const nextMode = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setMode(nextMode)}
      className={[
        "inline-flex items-center justify-center rounded-md border border-border bg-card px-2 py-1 text-sm",
        "hover:bg-white/60 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]",
        className,
      ].join(" ")}
      aria-label={`Switch to ${THEME_LABEL[nextMode]} theme`}
      title={`Switch to ${THEME_LABEL[nextMode]} theme`}
    >
      {`Theme: ${THEME_LABEL[mode]}`}
    </button>
  );
}

