import { expect, test } from '@playwright/test'

type LadleMeta = {
  stories: Record<string, unknown>
}

const port = 61000
const origin = `http://127.0.0.1:${port}`
const meta = (await fetch(`${origin}/meta.json`).then((response) => response.json())) as LadleMeta
const storyIds = Object.keys(meta.stories).sort()

for (const storyId of storyIds) {
  test(`${storyId} visual snapshot`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${origin}/?story=${storyId}&mode=preview`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-storyloaded]')
    // Hard-stop every animation/transition so capture is timing-independent.
    // toHaveScreenshot's `animations: 'disabled'` does not reliably freeze
    // infinite CSS animations (e.g. the LoadingIndicator spinner), which left
    // the spinner captured at a different rotation on CI than locally.
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }`,
    })
    await expect(page).toHaveScreenshot(`${storyId}.png`, {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
    })
  })
}
