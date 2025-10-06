// eslint.config.js
import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import next from "@next/eslint-plugin-next"

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "_archive/**",
      ".turbo/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Глобальные правила для всех пакетов ---
  {
    files: ["apps/web-next/**/*.{ts,tsx,js,jsx}"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: ["apps/web-next/tsconfig.json"],        // ← выбираем один tsconfig
      tsconfigRootDir: new URL('.', import.meta.url).pathname}
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": ["warn", { "ts-expect-error": "allow-with-description" }],
    },
  },

  // --- Отдельная конфигурация для Next.js (apps/web-next) ---
  {
    files: ["apps/web-next/**/*.{ts,tsx,js,jsx}"],
    plugins: { "@next/next": next },
    rules: {
      ...next.configs["core-web-vitals"].rules,
      "no-console": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-function": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]


