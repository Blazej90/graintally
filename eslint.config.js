import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'playwright-report', 'test-results', 'mnt'],
  },

  // Kod aplikacji — reguły wymagające informacji o typach (projectService),
  // bo bez nich odpadają najcenniejsze tu kontrole, np. no-floating-promises.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      // W eslint-plugin-react-hooks 7 warianty spod `configs.*` są nadal
      // w formacie eslintrc — flat config siedzi pod `configs.flat.*`.
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Nieużyta zmienna z prefiksem _ jest celowa (np. pomijany argument
      // callbacku), więc nie ma o niej krzyczeć.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Testy e2e i pliki konfiguracyjne chodzą w node, nie w przeglądarce.
  {
    files: ['tests/**/*.ts', '*.config.ts', '*.config.js'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  }
);
