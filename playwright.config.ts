import { defineConfig, devices } from '@playwright/test';

// Port przybity na sztywno: domyślny 5173 bywa zajęty przez ręcznie
// uruchomiony `pnpm run dev`, a strictPort daje czytelny błąd zamiast cichego
// przeskoku na inny port, pod którym testy szukałyby nie tej aplikacji.
const PORT = 5199;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // `pnpm run dev --` przekazałoby `--` dosłownie do vite, stąd exec.
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
