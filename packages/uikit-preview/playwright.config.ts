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
    // Build the whole workspace: stories bundle each dependency's `dist/`, so a
    // package that was not rebuilt renders its previous component. See PR #115.
    // CI already ran the root build (and `snapshot:check-stale` over it), and
    // `reuseExistingServer` is false there — so building here too would compile
    // all 15 packages a second time and throw the checked artifacts away.
    command: process.env.CI
      ? 'npm run snapshot:serve'
      : 'npm --prefix ../.. run build && npm run snapshot:serve',
    port,
    reuseExistingServer: !process.env.CI,
    // Off CI this has to cover a cold 15-package root build (15 `tsc -p`, Panda
    // codegen + cssgen, a full Ladle/Vite production build) before anything
    // binds; 180s was the ceiling for the old preview-only build and does not
    // stretch that far. On CI the command only serves an already-built dist, so
    // it keeps the tighter budget rather than turning a hung server into a
    // ten-minute wait.
    timeout: process.env.CI ? 120_000 : 600_000,
  },
})
