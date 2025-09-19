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
        bg0: "#0B0F14",
        primary: "#3B82F6", // blue accent
        primary2: "#3B82F6",
        accent: "#60A5FA", // links
        // Design system brand tokens (blue variant)
        brand: {
          primary: "#3B82F6",
          primaryFg: "#FFFFFF",
          surface: "#0F1115",
          surfaceElev: "#141720",
        },
        // flat keys for utilities like ring-brand-primary
        "brand-primary": "#3B82F6",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
      container: {
        center: true,
        padding: "1rem",
        screens: { "2xl": "1200px" },
      },
    },
  },
  // Включаем forms только в class-режиме, чтобы не «выбелить» всё приложение
  plugins: [forms({ strategy: "class" })],
};
