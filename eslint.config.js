// eslint.config.js
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import hooksPlugin from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'

/** @type {import('eslint').FlatConfig[]} */
export default [
  // 1️⃣ Global ignores
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'build/',
      'dist/',
      'coverage/',
      '**/*.config.js',
      '**/*.config.ts',
      'jest.setup.js',
    ],
  },

  // 2️⃣ Base ESLint recommended rules
  eslint.configs.recommended,

  // 3️⃣ TypeScript recommended rules
  ...tseslint.configs.recommended,

  // 4️⃣ React, Hooks, Next.js, and custom rules
  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
      react: reactPlugin,
    },

    rules: {
      // React Hooks rules
      ...hooksPlugin.configs.recommended.rules,

      // General JS/TS rules
      'prefer-const': 'error',
      'no-var': 'error',

      // Warnings
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Turn off unnecessary rules for Next.js/TS
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },

    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
