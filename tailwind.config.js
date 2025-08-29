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