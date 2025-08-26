// ESLint Flat Config tailored for StreamVault
// - Enforces no `require()` in app code
// - Allows require() in scripts and tests
// - Strong TypeScript rules for main code, relaxed in tests/scripts
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import hooksPlugin from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'
import jestPlugin from 'eslint-plugin-jest'

/** @type {import('eslint').FlatConfig[]} */
export default [
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

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      // Keep hooks recommended
      ...hooksPlugin.configs.recommended.rules,

      // Enforce modern JS
      'prefer-const': 'error',
      'no-var': 'error',

      // React & Next conveniences
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // TypeScript hygiene (strict for app)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Enforce ES module imports in app code
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-var-requires': 'error',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Tests: allow require(), relax any and unused vars
  {
    files: ['tests/**/*.{js,ts,tsx}', 'jest.setup.js', '**/*.test.{js,ts,tsx}', '**/__tests__/**/*'],
    plugins: { jest: jestPlugin },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        jest: true,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
    },
  },

  // Scripts folder: CommonJS utilities are allowed
  {
    files: ['scripts/**/*.{js,ts}'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Types: allow "any" in typings if necessary (legacy or external shapes)
  {
    files: ['types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]