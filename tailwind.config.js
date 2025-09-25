// tailwind.config.js
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./apps/web/index.html",
    "./apps/web/src/**/*.{js,ts,jsx,tsx}",
    "./apps/web-next/app/**/*.{js,ts,jsx,tsx}",
    "./apps/web-next/components/**/*.{js,ts,jsx,tsx}",
    "./apps/web-next/lib/**/*.{js,ts,jsx,tsx}",
    "./apps/admin/index.html",
    "./apps/admin/src/**/*.{js,ts,jsx,tsx}",
    "./packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "./packages/shared/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      colors: {
        bg0: "#0b0a0f",
        primary: "#b86bff",
        primary2: "#7c3aed",
        accent: "#22d3ee",
        hot: "#ff1f8f",
        lime: "#3bd671",
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
        bg: 'var(--ui-bg)',
        card: 'var(--ui-card)',
        border: 'var(--ui-border)',
        text: 'var(--ui-text)',
        muted: 'var(--ui-muted)',
        accentFg: 'var(--ui-accent-fg)',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,.08)',
        ring: '0 0 0 3px var(--ui-accent-20)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [forms({ strategy: "class" })],
};
