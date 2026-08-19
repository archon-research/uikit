import { describe, expect, it } from 'vitest';

import {
  THEME_BOOTSTRAP_SCRIPT,
  resolveBootstrapTheme,
} from './theme-bootstrap.js';
import {
  THEME_LEGACY_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './theme-storage.js';

type StorageContents = Record<string, string> | 'throws';

/**
 * Evaluates the *shipped* script string against minimal `window`/`document`
 * stubs. Passing them as parameters shadows the globals inside the script, so
 * this exercises the real string (the thing consumers inline) rather than a
 * re-implementation of its logic.
 */
function runBootstrapScript(options: {
  storage?: StorageContents;
  prefersDark?: boolean;
  noMatchMedia?: boolean;
}): { isDark: boolean; theme: string | undefined } {
  const { storage = {}, prefersDark = false, noMatchMedia = false } = options;

  const classNames = new Set<string>();
  const documentElement = {
    classList: {
      toggle: (name: string, force: boolean) => {
        if (force) {
          classNames.add(name);
        } else {
          classNames.delete(name);
        }
      },
    },
    dataset: {} as { theme?: string },
  };

  const localStorage = {
    getItem: (key: string) => {
      if (storage === 'throws') {
        throw new Error('storage is unavailable');
      }
      return key in storage ? storage[key] : null;
    },
  };

  const windowStub = {
    localStorage,
    matchMedia: noMatchMedia
      ? undefined
      : (query: string) => ({
          matches: query.includes('dark') ? prefersDark : false,
        }),
  };

  // oxlint-disable-next-line no-new-func -- evaluating the shipped script string
  // under stubbed globals is the point of this test.
  const evaluate = new Function('window', 'document', THEME_BOOTSTRAP_SCRIPT);
  evaluate(windowStub, { documentElement });

  return {
    isDark: classNames.has('dark'),
    theme: documentElement.dataset.theme,
  };
}

describe('THEME_BOOTSTRAP_SCRIPT', () => {
  it('reads the same storage keys ThemeProvider writes', () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(`'${THEME_STORAGE_KEY}'`);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(`'${THEME_LEGACY_STORAGE_KEY}'`);
  });

  it('uses ES5-safe syntax only', () => {
    expect(THEME_BOOTSTRAP_SCRIPT).not.toMatch(/\b(?:const|let)\s/);
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('=>');
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('?.');
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('??');
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('`');
  });

  it('applies a stored dark theme', () => {
    expect(
      runBootstrapScript({ storage: { [THEME_STORAGE_KEY]: 'dark' } }),
    ).toEqual({ isDark: true, theme: 'dark' });
  });

  it('applies a stored light theme even when the system prefers dark', () => {
    expect(
      runBootstrapScript({
        storage: { [THEME_STORAGE_KEY]: 'light' },
        prefersDark: true,
      }),
    ).toEqual({ isDark: false, theme: 'light' });
  });

  it('resolves a stored auto theme against prefers-color-scheme', () => {
    expect(
      runBootstrapScript({
        storage: { [THEME_STORAGE_KEY]: 'auto' },
        prefersDark: true,
      }),
    ).toEqual({ isDark: true, theme: 'dark' });
    expect(
      runBootstrapScript({
        storage: { [THEME_STORAGE_KEY]: 'auto' },
        prefersDark: false,
      }),
    ).toEqual({ isDark: false, theme: 'light' });
  });

  it('falls back to the legacy key', () => {
    expect(
      runBootstrapScript({ storage: { [THEME_LEGACY_STORAGE_KEY]: 'dark' } }),
    ).toEqual({ isDark: true, theme: 'dark' });
  });

  it('prefers the current key over the legacy key', () => {
    expect(
      runBootstrapScript({
        storage: {
          [THEME_STORAGE_KEY]: 'light',
          [THEME_LEGACY_STORAGE_KEY]: 'dark',
        },
      }),
    ).toEqual({ isDark: false, theme: 'light' });
  });

  it('falls back to matchMedia with no stored value', () => {
    expect(runBootstrapScript({ prefersDark: true })).toEqual({
      isDark: true,
      theme: 'dark',
    });
    expect(runBootstrapScript({ prefersDark: false })).toEqual({
      isDark: false,
      theme: 'light',
    });
  });

  it('ignores an unrecognised stored value', () => {
    expect(
      runBootstrapScript({
        storage: { [THEME_STORAGE_KEY]: 'chartreuse' },
        prefersDark: true,
      }),
    ).toEqual({ isDark: true, theme: 'dark' });
  });

  it('still applies a theme when storage throws', () => {
    expect(
      runBootstrapScript({ storage: 'throws', prefersDark: true }),
    ).toEqual({ isDark: true, theme: 'dark' });
  });

  it('resolves to light when matchMedia is unavailable', () => {
    expect(runBootstrapScript({ noMatchMedia: true })).toEqual({
      isDark: false,
      theme: 'light',
    });
  });
});

describe('resolveBootstrapTheme', () => {
  it('agrees with the script for every stored value', () => {
    const cases = [
      { stored: 'dark', prefersDark: false },
      { stored: 'light', prefersDark: true },
      { stored: 'auto', prefersDark: true },
      { stored: 'auto', prefersDark: false },
      { stored: null, prefersDark: true },
      { stored: 'nonsense', prefersDark: false },
    ] as const;

    for (const { stored, prefersDark } of cases) {
      const resolved = resolveBootstrapTheme({
        stored,
        legacyStored: null,
        prefersDark,
      });
      const scripted = runBootstrapScript({
        storage: stored === null ? {} : { [THEME_STORAGE_KEY]: stored },
        prefersDark,
      });
      expect(resolved.isDark).toBe(scripted.isDark);
    }
  });

  it('falls back through the legacy value to auto', () => {
    expect(
      resolveBootstrapTheme({
        stored: null,
        legacyStored: 'dark',
        prefersDark: false,
      }).mode,
    ).toBe('dark');
    expect(
      resolveBootstrapTheme({
        stored: null,
        legacyStored: null,
        prefersDark: false,
      }).mode,
    ).toBe('auto');
  });
});
