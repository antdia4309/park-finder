// Checks the code for mistakes like unused variables and broken React hook rules.
// Run with: npm run lint
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['build', 'node_modules', '.osm-cache']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Components are used in JSX, which this rule can't see, so skip capitalized names.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Node scripts and config files.
    files: ['scripts/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests can use Vitest's globals like vi and expect.
    files: ['**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: { globals: { ...globals.vitest } },
  },
]);
