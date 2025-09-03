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
