import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    // Opt into an existing browser, e.g. PLAYWRIGHT_CHANNEL=msedge, without downloading one.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    offline: true,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Intentionally no webServer: production must run directly from file://, offline.
})
