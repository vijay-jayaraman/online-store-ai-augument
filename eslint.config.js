import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import n from 'eslint-plugin-n';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/build/',
    '**/coverage/',
    '**/playwright-report/',
    '**/test-results/',
    'docs/',
    'mock_ui/',
    'Notes/',
  ]),

  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // Node code: API, shared package, end-to-end tests, root config and scripts.
  {
    files: [
      'apps/api/**/*.{js,mjs,cjs}',
      'packages/**/*.{js,mjs,cjs}',
      'e2e/**/*.{js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
      '*.{js,mjs,cjs}',
    ],
    extends: [n.configs['flat/recommended-module']],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Command-line scripts set their exit status directly.
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    rules: {
      'n/no-process-exit': 'off',
    },
  },

  // React apps: store and admin.
  {
    files: ['apps/store/**/*.{js,jsx}', 'apps/admin/**/*.{js,jsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Vite and test config files in the React apps run in Node.
  {
    files: ['apps/store/*.config.js', 'apps/admin/*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Turns off rules that conflict with Prettier. Must stay last.
  prettier,
]);
