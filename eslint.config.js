'use strict';

// ESLint 9 (flat config). Needs Node >= 18.18 – the SPFx build itself runs on Node 8.
const js = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const importPlugin = require('eslint-plugin-import');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const react = require('eslint-plugin-react');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  globalIgnores([
    '**/*.cjs',
    '**/*.js',
    '**/coverage',
    '**/dist',
    '**/etc',
    '**/lib',
    '**/lib-amd',
    '**/lib-commonjs',
    '**/node_modules',
    '**/sharepoint',
    '**/temp',
    '**/*.scss.ts'
  ]),
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      react.configs.flat.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      jsxA11y.flatConfigs.recommended
    ],

    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },

    settings: {
      react: { version: 'detect' },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx', '.d.ts']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [__dirname + '/tsconfig.json']
        }
      }
    },

    rules: {
      'no-var': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/default-param-last': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',

      'react/destructuring-assignment': 'warn',
      'react/no-unused-prop-types': 'warn',
      'react/no-unknown-property': 'warn',
      'react/no-array-index-key': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-this-in-sfc': 'error',
      'react/no-unused-state': 'error',

      'import/no-named-as-default': 'off',
      // SPFx resolves the localized strings module at runtime (config.json → localizedResources).
      'import/no-unresolved': ['error', { ignore: ['Strings$'] }],
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          ['internal', 'parent', 'sibling', 'index'],
          ['object', 'unknown']
        ],
        pathGroups: [
          { pattern: 'react', group: 'external', position: 'before' },
          { pattern: '@microsoft/**', group: 'external', position: 'before' },
          { pattern: '~/**', group: 'external', position: 'before' },
          { pattern: '@src/**', group: 'internal' }
        ],
        pathGroupsExcludedImportTypes: ['react', 'type'],
        alphabetize: { order: 'asc' },
        'newlines-between': 'never'
      }]
    }
  }
]);
