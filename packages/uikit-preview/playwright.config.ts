import { defineConfig, devices } from '@playwright/test'

const port = 61000
const baseURL = `http://0.0.0.0:${port}`

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
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
