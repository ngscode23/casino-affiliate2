// eslint.config.js (ESM, ESLint v9+)
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import nextPluginModule from '@next/eslint-plugin-next'

import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextPlugin = nextPluginModule.default ?? nextPluginModule
const nextFlatConfig = nextPluginModule.flatConfig ?? {}

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
      '*.log',
      'eslint.config.js'
    ]
  },

  ...(nextFlatConfig.coreWebVitals ? [nextFlatConfig.coreWebVitals] : []),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Фронтенд-зона
  {
    files: [
      '**/*.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.base.json',
          '../../tsconfig.base.json',
          '../../tsconfig.json',
          '../../apps/*/tsconfig.json',
          '../../packages/*/tsconfig.json',
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
      '@next/next': nextPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './tsconfig.base.json',
            '../../tsconfig.base.json',
            '../../tsconfig.json',
            '../../apps/*/tsconfig.json',
            '../../packages/*/tsconfig.json',
          ],
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/no-unused-vars': 'off',

      '@typescript-eslint/no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      }],

    },
  },

  // Сервер/скрипты (Node)
  {
    files: [
      'scripts/**/*.{ts,js}',
      '**/middleware.ts',
      '**/next.config.*',
      '**/server/**/*.{ts,js}',
      '**/api/**/*.{ts,js}',
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
          '../../tsconfig.base.json',
          '../../tsconfig.json',
          '../../apps/*/tsconfig.json',
          '../../packages/*/tsconfig.json',
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
  {
    files: [
      '**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]


