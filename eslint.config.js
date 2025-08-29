// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // 1) Игноры — чтобы ESLint не лез в node_modules и бэкапы
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'backup_before_cleanup_*/**',
      'backup_before_restore/**',
       "_archive/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "node_modules/**"
      // если надо — добавь ещё ваши служебные папки
    ],
  },


  
  // 2) Базовые рекомендации
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3) Наши правила только для исходников
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',

      // ослабляем шум, чтобы не тонуть
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],
    },
  },
]

