import { expect, test } from '@playwright/test'

type LadleMeta = {
  stories: Record<string, unknown>
}

const port = 61000
const origin = `http://127.0.0.1:${port}`
const meta = (await fetch(`${origin}/meta.json`).then((response) => response.json())) as LadleMeta

// SNAPSHOT_STORY_IDS narrows the run to a comma-separated allow-list of story
// ids. On pull requests CI sets it to only the stories whose PNGs changed (the
// merge-queue run stays unfiltered, so the full suite is the merge gate); the
// `snapshot:update:affected` script sets it to the stories a local diff touched.
// Unset (merge_group, `snapshot:update`, local `snapshot:test`) means "all".
const filterRaw = process.env.SNAPSHOT_STORY_IDS?.trim()
const filter = filterRaw ? new Set(filterRaw.split(',').map((id) => id.trim()).filter(Boolean)) : null
const storyIds = Object.keys(meta.stories)
  .sort()
  .filter((storyId) => filter === null || filter.has(storyId))

// Stories that connect to a live relay (real network + wall-clock timestamps in
// the activity log) are not deterministic enough for a pixel snapshot. They are
// still rendered in the preview; only their snapshot is skipped. Static prop-
// driven coverage of the same UI lives in the other MCP Connect / Harness
// Connect stories.
const SKIP_SNAPSHOT = new Set(['organisms--mcp-connect--control-preview'])

// A filter that matches nothing (e.g. a PR that only deletes a story and its
// PNG) would leave Playwright with zero tests and fail the run; register a
// skipped placeholder so the job stays green with nothing to verify.
if (filter !== null && storyIds.length === 0) {
  test.skip('no snapshots in scope', () => {})
}

for (const storyId of storyIds) {
  const declare = SKIP_SNAPSHOT.has(storyId) ? test.skip : test
  declare(`${storyId} visual snapshot`, async ({ page }) => {
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
