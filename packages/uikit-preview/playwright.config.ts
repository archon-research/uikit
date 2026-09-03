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
    // Build the whole workspace, not just this package. Stories import
    // `@archon-research/*` through each package's `exports`, which resolve to
    // `dist/` — so rendering against a dependency that was not rebuilt shows
    // its PREVIOUS component, which matches its PREVIOUS baseline and passes
    // while asserting nothing. Root `npm run build` (`--workspaces
    // --if-present`, dependency-ordered) includes this package's own build, so
    // this is still a single pass. CI already builds before this step; the
    // warm rebuild there costs seconds.
    command: 'npm --prefix ../.. run build && npm run snapshot:serve',
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
