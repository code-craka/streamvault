// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

/** @type {import('typescript-eslint').Config} */
export default tseslint.config(
  // 1. Global ignores
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

  // 2. Base ESLint rules
  eslint.configs.recommended,

  // 3. TypeScript-specific rules
  ...tseslint.configs.recommended,

  // 4. React, React Hooks, Next.js config
  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    // Use safe spread for React plugin (avoids flat API issues)
    ...reactPlugin.configs.recommended,

    plugins: {
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      // React Hooks rules
      ...hooksPlugin.configs.recommended.rules,

      // General JS/TS rules
      'prefer-const': 'error',
      'no-var': 'error',

      // Warnings
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Turn off unnecessary rules for Next.js/TS
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  }
);