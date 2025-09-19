// tailwind.config.js
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    // Брейкпоинты можно оставить так
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      // НЕ затираем базовые цвета Tailwind, а расширяем
      colors: {
        // Legacy/colors already used across the app
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
        // New theme tokens mapped to CSS variables
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
      container: {
        center: true,
        padding: "1rem",
        screens: { "2xl": "1280px" },
      },
    },
  },
  // Включаем forms только в class-режиме, чтобы не «выбелить» всё приложение
  plugins: [forms({ strategy: "class" })],
};
