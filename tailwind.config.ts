import lineClamp from "@tailwindcss/line-clamp";
import forms from "@tailwindcss/forms";
import plugin from "tailwindcss/plugin";

export const themeAdminTokens = {
  "--bg-rgb": "245 246 248",
  "--card-rgb": "255 255 255",
  "--fg-rgb": "31 41 55",
  "--muted-rgb": "243 244 246",
  "--mutedfg-rgb": "100 116 139",
  "--secondary-rgb": "249 250 251",
  "--secondaryfg-rgb": "71 85 105",
  "--accent-rgb": "234 238 255",
  "--accentfg-rgb": "79 70 229",
  "--border-rgb": "215 223 235",
  "--primary-rgb": "29 78 216",
  "--primaryfg-rgb": "255 255 255",
  "--admin-surface-rgb": "255 255 255",
  "--admin-surface-muted-rgb": "247 249 252",
  "--admin-surface-subtle-rgb": "241 243 248",
  "--admin-elevated-rgb": "255 255 255",
  "--admin-border-strong-rgb": "198 206 220",
  "--admin-text-soft-rgb": "100 116 139",
  "--admin-text-subtle-rgb": "148 163 184",
  "--admin-success-rgb": "4 120 87",
  "--admin-success-foreground-rgb": "236 253 245",
  "--admin-warning-rgb": "180 83 9",
  "--admin-warning-foreground-rgb": "255 247 237",
  "--admin-danger-rgb": "220 38 38",
  "--admin-danger-foreground-rgb": "254 242 242",
  "--admin-info-rgb": "3 105 161",
  "--admin-info-foreground-rgb": "240 249 255",
  "--shadow-soft": "0 22px 50px -24px rgba(15, 23, 42, 0.18)",
  "--shadow-popover": "0 28px 64px -24px rgba(15, 23, 42, 0.2)",
  "--shadow-card": "0 18px 40px -22px rgba(15, 23, 42, 0.15)",
  "--shadow-card-hover": "0 22px 60px -20px rgba(29, 78, 216, 0.2)",
  "color-scheme": "light",
};

export default {
  safelist: [
    "grid",
    "grid-cols-2",
    "sm:grid-cols-3",
    "lg:grid-cols-4",
    "gap-6",
    "lg:gap-8",
  ],
  content: [
    "./apps/web/index.html",
    "./apps/web/src/**/*.{js,jsx,ts,tsx}",
    "./apps/web-next/app/**/*.{ts,tsx}",
    "!./apps/web-next/app/admin/**/*.{ts,tsx}",
    "./apps/web-next/**/*.{js,jsx}",
    "!./apps/web-next/app/admin/**/*.{js,jsx}",
    "!./apps/web-next/components/admin/**/*.{js,jsx}",
    "./apps/web-next/components/**/*.{ts,tsx}",
    "!./apps/web-next/components/admin/**/*.{ts,tsx}",
    "./apps/web-next/lib/**/*.{ts,tsx}",
    "./apps/web-next/utils/**/*.{ts,tsx}",
    "./packages/ui/src/**/*.{js,jsx,ts,tsx}",
    "./packages/shared/src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "1.5rem" },
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1920px" },
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
        admin: {
          bg: "rgb(var(--bg-rgb))",
          surface: "rgb(var(--admin-surface-rgb))",
          surfaceMuted: "rgb(var(--admin-surface-muted-rgb))",
          surfaceSubtle: "rgb(var(--admin-surface-subtle-rgb))",
          elevated: "rgb(var(--admin-elevated-rgb))",
          border: "rgb(var(--border-rgb))",
          borderStrong: "rgb(var(--admin-border-strong-rgb))",
          text: "rgb(var(--fg-rgb))",
          textSoft: "rgb(var(--admin-text-soft-rgb))",
          textSubtle: "rgb(var(--admin-text-subtle-rgb))",
          primary: {
            DEFAULT: "rgb(var(--primary-rgb))",
            foreground: "rgb(var(--primaryfg-rgb))",
          },
          success: {
            DEFAULT: "rgb(var(--admin-success-rgb))",
            foreground: "rgb(var(--admin-success-foreground-rgb))",
          },
          warning: {
            DEFAULT: "rgb(var(--admin-warning-rgb))",
            foreground: "rgb(var(--admin-warning-foreground-rgb))",
          },
          danger: {
            DEFAULT: "rgb(var(--admin-danger-rgb))",
            foreground: "rgb(var(--admin-danger-foreground-rgb))",
          },
          info: {
            DEFAULT: "rgb(var(--admin-info-rgb))",
            foreground: "rgb(var(--admin-info-foreground-rgb))",
          },
        },
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "OpenAI Sans", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display, var(--font-sans))", "OpenAI Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["2.375rem", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["1.85rem", { lineHeight: "1.25", fontWeight: "700" }],
        h3: ["1.45rem", { lineHeight: "1.35", fontWeight: "600" }],
        base: ["1rem", { lineHeight: "1.65" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "admin-card": "var(--shadow-card)",
        "admin-card-hover": "var(--shadow-card-hover)",
        "admin-popover": "var(--shadow-popover)",
      },
    },
  },
  plugins: [
    lineClamp,
    forms({ strategy: "class" }),
    plugin(({ addBase, addUtilities }) => {
      addBase({
        ":root": {
          "--sidebar-width": "clamp(16.5rem, 19vw, 19.5rem)",
          "--sidebar-w": "clamp(16.5rem, 19vw, 19.5rem)",
          "--sidebar-gap": "clamp(1.5rem, 2vw, 1.75rem)",
          "--mobile-tab-bar-height": "3.5rem",
          "--radius": "1.5rem",
          "--bg-rgb": "250 246 235",
          "--card-rgb": "255 251 244",
          "--fg-rgb": "58 47 38",
          "--muted-rgb": "232 224 213",
          "--mutedfg-rgb": "116 102 88",
          "--secondary-rgb": "245 236 222",
          "--secondaryfg-rgb": "74 60 48",
          "--accent-rgb": "210 185 135",
          "--accentfg-rgb": "70 56 40",
          "--border-rgb": "224 212 198",
          "--primary-rgb": "229 94 121",
          "--primaryfg-rgb": "255 255 249",
          "--shadow-soft": "0 30px 78px -48px rgba(102, 78, 55, 0.18)",
          "--shadow-popover": "0 34px 94px -50px rgba(102, 78, 55, 0.22)",
          "--shadow-card": "0 28px 84px -48px rgba(102, 78, 55, 0.18)",
          "--shadow-card-hover": "0 44px 118px -54px rgba(229, 94, 121, 0.26)",
          "color-scheme": "light",
        },
        ".dark": {
          "--bg-rgb": "2 6 14",
          "--card-rgb": "7 16 30",
          "--fg-rgb": "229 238 255",
          "--muted-rgb": "118 134 160",
          "--mutedfg-rgb": "192 204 224",
          "--secondary-rgb": "12 22 42",
          "--secondaryfg-rgb": "236 244 255",
          "--accent-rgb": "10 105 236",
          "--accentfg-rgb": "230 242 255",
          "--border-rgb": "32 48 70",
          "--primary-rgb": "252 50 114",
          "--primaryfg-rgb": "20 10 27",
          "--shadow-soft": "0 28px 80px -34px rgba(0, 0, 0, 0.65)",
          "--shadow-popover": "0 40px 120px -44px rgba(0, 0, 0, 0.72)",
          "--shadow-card": "0 28px 80px -34px rgba(0, 0, 0, 0.65)",
          "--shadow-card-hover": "0 52px 130px -44px rgba(252, 50, 114, 0.5)",
          "color-scheme": "dark",
        },
        ".theme-noir": {
          "--bg-rgb": "10 10 14",
          "--card-rgb": "18 18 28",
          "--fg-rgb": "236 236 246",
          "--muted-rgb": "112 112 132",
          "--mutedfg-rgb": "210 210 224",
          "--secondary-rgb": "26 26 42",
          "--secondaryfg-rgb": "236 236 246",
          "--accent-rgb": "84 92 214",
          "--accentfg-rgb": "240 240 252",
          "--border-rgb": "46 48 68",
          "--primary-rgb": "252 50 114",
          "--primaryfg-rgb": "18 16 28",
          "--shadow-soft": "0 24px 80px -46px rgba(0,0,0,0.7)",
          "--shadow-popover": "0 38px 120px -54px rgba(0,0,0,0.75)",
          "--shadow-card": "0 30px 90px -48px rgba(0,0,0,0.7)",
          "--shadow-card-hover": "0 54px 138px -52px rgba(252, 50, 114, 0.48)",
        },
        body: {
          backgroundColor: "rgb(var(--bg-rgb))",
          color: "rgb(var(--fg-rgb))",
          fontFamily: "var(--font-sans, 'OpenAI Sans', system-ui)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
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
        const percent = `${i}%`;
        utilities[`.left-pct-${i}`] = { left: percent };
        utilities[`.right-pct-${i}`] = { right: percent };
        utilities[`.w-pct-${i}`] = { width: percent };
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
};
