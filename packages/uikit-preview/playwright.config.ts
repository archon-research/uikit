import { defineConfig, devices } from '@playwright/test'

const port = 61000
const baseURL = `http://0.0.0.0:${port}`

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    // Absorb sub-pixel anti-aliasing jitter between machines on the same macOS
    // version (see microsoft/playwright#20097) with a small absolute pixel
    // budget. A 0.01 ratio scaled with full-page height into a ~9k-pixel budget
    // that masked real content changes (e.g. a changed preset label slipped
    // through); an absolute cap stays tight regardless of page size.
    toHaveScreenshot: { maxDiffPixels: 200 },
  },
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run snapshot:serve',
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
