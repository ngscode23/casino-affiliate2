// eslint.config.js (ESM, ESLint v9+)
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'

import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  // Глобальные игноры (заменяют .eslintignore)
  {
    ignores: [
      'node_modules/**',
      '.pnpm/**',
      'pnpm-store/**',
      '.turbo/**',
      '**/.turbo/**',
      '.next/**',
      '**/.next/**',
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
      'tmp/**',
      '__pycache__/**',
      '**/*.tsbuildinfo',
      '*.log'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Фронтенд-зона
  {
    files: [
      'apps/**/*.{ts,tsx,js,jsx}',
      'packages/**/*.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.base.json',
          './apps/*/tsconfig.json',
          './packages/*/tsconfig.json',
        ],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            'tsconfig.json',
            'tsconfig.base.json',
            'apps/*/tsconfig.json',
            'packages/*/tsconfig.json',
          ],
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],

      '@typescript-eslint/no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      }],

      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.{test,spec}.{ts,tsx,js,jsx}',
          'tests/**',
          'e2e/**',
          'scripts/**',
        ],
      }],
    },
  },

  // Сервер/скрипты (Node)
  {
    files: [
      'scripts/**/*.{ts,js}',
      'apps/**/middleware.ts',
      'apps/**/next.config.*',
      'apps/**/server/**/*.{ts,js}',
      'apps/**/api/**/*.{ts,js}',
      'apps/functions/**/*.{ts,js}',
    ],
    // В flat-config НЕТ excludedFiles. Если нужно что-то исключить тут же — пользуйся "ignores".
    ignores: [
      'apps/web-next/public/**',
      'apps/web-next/.next/**',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.base.json',
          './apps/*/tsconfig.json',
          './packages/*/tsconfig.json',
        ],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
]