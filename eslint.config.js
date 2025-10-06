// eslint.config.js (ESM, ESLint v9+)
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import' // проверки импортов

export default [
  // Глобальные игноры (вместо .eslintignore)
  {
    ignores: [
      'node_modules/**',
      '.pnpm/**',
      'pnpm-store/**',
      '.turbo/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '_archive/**',
      'public/**',
      'apps/web-next/public/**',
      'apps/web-next/supabase/**',
      'infra/supabase/**',
      'supabase/**',
      '**/*.tsbuildinfo',
      'tmp/**',
      '__pycache__/**',
      '*.log'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Фронтенд зона: apps/** и packages/**
  {
    files: [
      'apps/**/*.{ts,tsx,js,jsx}',
      'packages/**/*.{ts,tsx,js,jsx}'
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin
    },
    settings: {
      // ВАЖНО: чтобы import/no-unresolved понимал ts-alias и монорепу
      'import/resolver': {
        typescript: {
          // перечисляем tsconfig’и пакетов, иначе резолвер «слепой»
          project: [
            'tsconfig.json',
            'tsconfig.base.json',
            'apps/*/tsconfig.json',
            'packages/*/tsconfig.json'
          ],
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      // React/React Refresh
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',

      // TS послабления, как просил
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],

      // «пустые» выражения, но разрешаем short-circuit/ternary
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

      // Импорты по-взрослому
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.{test,spec}.{ts,tsx,js,jsx}',
          'tests/**',
          'e2e/**',
          'scripts/**'
        ]
      }]
    }
  },

  // Node-зона: скрипты, тулзы, функции
  {
    files: ['scripts/**/*.{ts,tsx,js}', 'apps/functions/**/*.{ts,js}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      // в node-скриптах консоль не запрещаем
      'no-console': 'off'
    }
  }
]