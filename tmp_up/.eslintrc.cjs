// Classic ESLint config for Vite + TS project
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  env: { browser: true, es2021: true, node: true },
  ignorePatterns: [
    "_archive/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "node_modules/**"
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: null
  },
  rules: {
    // добавляй свои правила ниже при необходимости
  }
};
