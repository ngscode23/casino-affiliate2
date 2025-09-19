// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",                // ручной контроль тёмной темы
  theme: {
    extend: {
      fontFamily: {
        // чтобы Inter подтянулся по классу font-sans
        sans: ['InterVariable', 'Inter', 'ui-sans-serif', 'system-ui']
      },
      container: {
        center: true,
        padding: "1rem",
        screens: { "2xl": "1280px" }
      }
    }
  },
  plugins: []
};