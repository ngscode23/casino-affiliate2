import type { Config } from "tailwindcss";
import lineClamp from "@tailwindcss/line-clamp";
import plugin from "tailwindcss/plugin";

export default {
  content: [
    "./apps/web/index.html",
    "./apps/web/src/**/*.{js,jsx,ts,tsx}",
    "./apps/web-next/app/**/*.{ts,tsx}",
    "./apps/web-next/components/**/*.{ts,tsx}",
    "./apps/web-next/lib/**/*.{ts,tsx}",
    "./apps/web-next/utils/**/*.{ts,tsx}",
    "./apps/admin/index.html",
    "./apps/admin/src/**/*.{js,jsx,ts,tsx}",
    "./packages/ui/src/**/*.{js,jsx,ts,tsx}",
    "./packages/shared/src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "1.5rem" },
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px", "2xl": "1200px" },
    },
    extend: {
      screens: {
        // кастомный брейкпоинт: адаптация начинается с 1818px
        "3xl": "1818px",
      },
      height: {
        card: "clamp(260px, 32vh, 420px)",
      },
      colors: {
        bg: "rgb(var(--bg-rgb))",
        card: {
          DEFAULT: "rgb(var(--card-rgb))",
          foreground: "rgb(var(--fg-rgb))",
        },
        fg: "rgb(var(--fg-rgb))",
        border: "rgb(var(--border-rgb))",
        primary: {
          DEFAULT: "rgb(var(--primary-rgb))",
          foreground: "rgb(var(--primaryfg-rgb))",
        },
        primaryfg: "rgb(var(--primaryfg-rgb))",
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb))",
          foreground: "rgb(var(--secondaryfg-rgb))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted-rgb))",
          foreground: "rgb(var(--mutedfg-rgb))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb))",
          foreground: "rgb(var(--accentfg-rgb))",
        },
      },
      fontSize: {
        h1: ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["1.75rem", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["1.375rem", { lineHeight: "1.35", fontWeight: "600" }],
        base: ["1rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
    },
  },
  plugins: [
    lineClamp,
    plugin(({ addBase, addUtilities }) => {
      addBase({
        ":root": {
          "--sidebar-width": "clamp(16.5rem, 19vw, 19.5rem)",
          "--sidebar-w": "clamp(16.5rem, 19vw, 19.5rem)",
          "--sidebar-gap": "clamp(1.5rem, 2vw, 1.75rem)",
          "--mobile-tab-bar-height": "3.5rem",
          "--radius": "1.5rem",
          "--bg-rgb": "249 246 241",
          "--card-rgb": "255 255 254",
          "--fg-rgb": "50 36 26",
          "--muted-rgb": "233 226 216",
          "--mutedfg-rgb": "105 86 73",
          "--secondary-rgb": "245 241 235",
          "--secondaryfg-rgb": "50 36 26",
          "--accent-rgb": "237 230 222",
          "--accentfg-rgb": "61 43 31",
          "--border-rgb": "228 220 211",
          "--primary-rgb": "80 59 43",
          "--primaryfg-rgb": "247 242 234",
          "--shadow-soft": "0 28px 55px -30px rgba(38, 28, 23, 0.45)",
          "--shadow-popover": "0 38px 70px -28px rgba(38, 28, 23, 0.55)",
          "--shadow-card": "0 28px 55px -30px rgba(38, 28, 23, 0.45)",
          "--shadow-card-hover": "0 38px 70px -28px rgba(38, 28, 23, 0.55)",
        },
        ".dark": {
          "--bg-rgb": "26 19 15",
          "--card-rgb": "39 29 22",
          "--fg-rgb": "250 246 239",
          "--muted-rgb": "65 54 47",
          "--mutedfg-rgb": "216 205 192",
          "--secondary-rgb": "57 44 35",
          "--secondaryfg-rgb": "250 246 239",
          "--accent-rgb": "75 59 48",
          "--accentfg-rgb": "250 246 239",
          "--border-rgb": "75 59 48",
          "--primary-rgb": "250 246 239",
          "--primaryfg-rgb": "80 59 43",
          "--shadow-soft": "0 26px 55px -30px rgba(0, 0, 0, 0.48)",
          "--shadow-popover": "0 34px 70px -28px rgba(0, 0, 0, 0.58)",
          "--shadow-card": "0 26px 55px -30px rgba(0, 0, 0, 0.48)",
          "--shadow-card-hover": "0 34px 70px -28px rgba(0, 0, 0, 0.58)",
        },
        ".theme-noir": {
          "--bg-rgb": "20 20 24",
          "--card-rgb": "32 32 38",
          "--fg-rgb": "234 230 220",
          "--muted-rgb": "88 88 96",
          "--mutedfg-rgb": "202 198 188",
          "--secondary-rgb": "60 60 68",
          "--secondaryfg-rgb": "234 230 220",
          "--accent-rgb": "72 70 82",
          "--accentfg-rgb": "234 230 220",
          "--border-rgb": "58 58 66",
          "--primary-rgb": "245 181 46",
          "--primaryfg-rgb": "26 24 18",
          "--shadow-soft": "0 22px 45px -26px rgba(0,0,0,0.55)",
          "--shadow-popover": "0 26px 55px -24px rgba(0,0,0,0.65)",
          "--shadow-card": "0 24px 50px -28px rgba(0,0,0,0.58)",
          "--shadow-card-hover": "0 34px 70px -26px rgba(0,0,0,0.68)",
        },
      });
      const utilities: Record<string, any> = {
        ".surface": {
          position: "relative",
          borderRadius: "inherit",
          backgroundColor: "color-mix(in oklab, rgb(var(--bg-rgb)) 58%, transparent)",
          border: "1px solid rgb(var(--border-rgb) / 0.42)",
          boxShadow: "var(--shadow-soft)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          backdropFilter: "blur(18px) saturate(140%)",
        },
        ".surface-popover": {
          position: "relative",
          borderRadius: "inherit",
          backgroundColor: "color-mix(in oklab, rgb(var(--bg-rgb)) 48%, transparent)",
          border: "1px solid rgb(var(--border-rgb) / 0.32)",
          boxShadow: "var(--shadow-popover)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          backdropFilter: "blur(24px) saturate(160%)",
        },
        ".surface-elevated": {
          position: "relative",
          borderRadius: "inherit",
          backgroundColor: "color-mix(in oklab, rgb(var(--card-rgb)) 82%, transparent)",
          border: "1px solid rgb(var(--border-rgb) / 0.38)",
          boxShadow: "var(--shadow-soft)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          backdropFilter: "blur(18px) saturate(140%)",
        },
        ".surface-border": {
          border: "1px solid rgb(var(--border-rgb) / 0.55)",
        },
        ".surface-divider": {
          borderColor: "rgb(var(--border-rgb) / 0.18)",
        },
        ".surface-ring": {
          boxShadow: "0 0 0 1px rgb(var(--border-rgb) / 0.4), 0 0 0 4px rgb(var(--primary-rgb) / 0.14)",
        },
        ".w-sidebar": { width: "var(--sidebar-w)" },
        ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom)" },
        ".tap-highlight-transparent": { WebkitTapHighlightColor: "transparent" },
        ".break-inside-avoid": { breakInside: "avoid" },
        ".glass-scroll": {
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(var(--border-rgb) / 0.4) transparent",
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgb(var(--border-rgb) / 0.32)",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-track": { background: "transparent" },
        },
      };

      for (let i = 0; i <= 100; i += 1) {
        utilities[`.left-pct-${i}`] = { left: `${i}%` };
        utilities[`.right-pct-${i}`] = { right: `${i}%` };
      }

      for (let n = 0; n <= 512; n += 1) {
        const size = `${n}px`;
        utilities[`.w-px-${n}`] = { width: size };
        utilities[`.h-px-${n}`] = { height: size };
        utilities[`.size-px-${n}`] = { width: size, height: size };
        utilities[`.h-bar-${n}`] = { height: size };
      }

      addUtilities(utilities);

      const columnGapUtilities = {
        ".column-gap-4": { columnGap: "1rem" },
        ".column-gap-5": { columnGap: "1.25rem" },
        ".column-gap-6": { columnGap: "1.5rem" },
      } satisfies Record<string, any>;

      addUtilities(columnGapUtilities, ["responsive"]);
    }),
  ],
} satisfies Config;
