/**
 * @vitest-environment jsdom
 *
 * The only jsdom-backed suite in this package (everything else is a pure
 * decision core tested in `node`). It has to render: the mechanism under test
 * is what `ThemeProvider` puts in its context on its *first* commit, before
 * any effect has run, and that is exactly what a pure function cannot show.
 */
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY } from './theme-storage.js';
import { ThemeProvider, readSystemPrefersDark } from './ThemeProvider.js';
import { useTheme, type ThemeContextValue } from './useTheme.js';

const realMatchMedia = window.matchMedia;

/**
 * jsdom's own `matchMedia` always reports `matches: false`, so a
 * `prefers-color-scheme: dark` preference has to be stubbed to be observable at
 * all. Only the `dark` query answers `prefersDark`; anything else stays false,
 * matching how a browser answers an unrelated query.
 */
function stubMatchMedia(prefersDark: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Stands in for the pre-paint bootstrap having already run. */
function stampBootstrapTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Renders the provider around a probe that records the context value on every
 * render pass. `renders[0]` is the pre-effect commit — the render whose theme
 * the user actually sees on a hydrated page, and the one the no-flash mechanism
 * is about. Later entries are the mount effect settling and are deliberately
 * not asserted on here.
 */
function renderThemeProbe(): ThemeContextValue[] {
  const renders: ThemeContextValue[] = [];

  function Probe() {
    renders.push(useTheme());
    return null;
  }

  render(createElement(ThemeProvider, null, createElement(Probe)));
  return renders;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
});

describe('ThemeProvider first render, with a bootstrap already applied', () => {
  it('agrees with a dark stamp even when matchMedia is blind to the preference', () => {
    // The regression shape: the bootstrap resolved dark before paint, but the
    // provider's own `matchMedia` read says light (the SSR/hydration case the
    // read-back exists for). Without the read-back the first commit would reset
    // <html> to light — the flash.
    stubMatchMedia(false);
    stampBootstrapTheme('dark');

    expect(renderThemeProbe()[0]).toMatchObject({ mode: 'auto', isDark: true });
  });

  it('agrees with a light stamp even when matchMedia reports dark', () => {
    stubMatchMedia(true);
    stampBootstrapTheme('light');

    expect(renderThemeProbe()[0]).toMatchObject({
      mode: 'auto',
      isDark: false,
    });
  });

  it('falls back to matchMedia when no bootstrap stamped anything', () => {
    stubMatchMedia(true);

    expect(renderThemeProbe()[0]).toMatchObject({ mode: 'auto', isDark: true });
  });

  it('applies an explicit stored mode over the stamp on the first render', () => {
    stubMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    stampBootstrapTheme('light');

    expect(renderThemeProbe()[0]).toMatchObject({ mode: 'dark', isDark: true });
  });
});

describe('readSystemPrefersDark', () => {
  it('reads a dark stamp back in auto mode', () => {
    stubMatchMedia(false);
    stampBootstrapTheme('dark');
    expect(readSystemPrefersDark('auto')).toBe(true);
  });

  it('reads a light stamp back in auto mode', () => {
    stubMatchMedia(true);
    stampBootstrapTheme('light');
    expect(readSystemPrefersDark('auto')).toBe(false);
  });

  it('ignores an unrecognised stamp value in auto mode', () => {
    stubMatchMedia(true);
    document.documentElement.dataset.theme = 'chartreuse';
    expect(readSystemPrefersDark('auto')).toBe(true);
  });

  it('does not consult the stamp under an explicit light mode', () => {
    // Under `'light'` the stamp reads `light` because that is the user's
    // choice, not the system preference. Seeding from it would tell the
    // provider the system prefers light, and switching back to `'auto'` would
    // then show the wrong theme. The system preference here is dark.
    stubMatchMedia(true);
    stampBootstrapTheme('light');
    expect(readSystemPrefersDark('light')).toBe(true);
  });

  it('does not consult the stamp under an explicit dark mode', () => {
    stubMatchMedia(false);
    stampBootstrapTheme('dark');
    expect(readSystemPrefersDark('dark')).toBe(false);
  });
});
