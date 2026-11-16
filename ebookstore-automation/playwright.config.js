import { defineConfig, devices } from '@playwright/test'

// Environment overrides:
//   UI_URL   (default http://localhost:3000)      - the React app (Vite dev server or built site)
//   API_URL  (default http://localhost:8080/api)  - used only for test data set-up / clean-up
//   BROWSER_CHANNEL (default chrome)              - 'chrome', 'msedge', or '' to use Playwright's bundled Chromium
const channel = process.env.BROWSER_CHANNEL ?? 'chrome'

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  outputDir: 'reports/artifacts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: process.env.UI_URL || 'http://localhost:3000',
    headless: !process.env.HEADED,
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.VIDEO ? 'retain-on-failure' : 'off', // needs `npx playwright install ffmpeg`
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
})
