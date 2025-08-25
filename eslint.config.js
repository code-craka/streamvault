// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

/** @type {import('typescript-eslint').Config} */
export default tseslint.config(
  // Global ignores
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

  // Base configurations for all files
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Configuration for React, React Hooks, and Next.js
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    // Use the NEW flat-compatible recommended config for React
    ...reactPlugin.configs.flat.recommended,

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
        version: 'detect', // Automatically detects the React version
      },
    },

    rules: {
      // Start with recommended rules for React Hooks
      ...hooksPlugin.configs.recommended.rules,
      
      // Your custom rules and overrides
      'prefer-const': 'error',
      'no-var': 'error',

      // Warnings for things you want to keep an eye on
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Rules that are often turned off in modern Next.js/TypeScript projects
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'react/react-in-jsx-scope': 'off', // Not needed with Next.js/React 17+
      'react/prop-types': 'off', // Not needed when using TypeScript for props
    },
  }
);