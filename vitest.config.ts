import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // e2e leży w tests/ i należy do Playwrighta — vitest ma go nie zbierać.
    include: ['src/**/*.test.ts'],
  },
});
