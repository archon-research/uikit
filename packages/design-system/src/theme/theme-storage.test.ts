import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  THEME_LEGACY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  readStoredThemeValues,
  writeStoredThemeMode,
} from './theme-storage.js';

/**
 * Installs a `window.localStorage` stub for the duration of one test. The suite
 * runs in the `node` environment, so there is no real `window` to shadow —
 * these accessors exist precisely so the DOM-free modules around them stay
 * testable here.
 */
function stubStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): Record<string, string> {
  vi.stubGlobal('window', { localStorage: storage });
  return {};
}

/** A `localStorage` that raises on every access, as Safari private mode can. */
const throwingStorage = {
  getItem(): string | null {
    throw new Error('SecurityError: storage is unavailable');
  },
  setItem(): void {
    throw new Error('QuotaExceededError: storage is full');
  },
};

/** A `localStorage` whose property ACCESS itself throws, not just its methods. */
const inaccessibleStorageWindow = {
  get localStorage(): Storage {
    throw new Error('SecurityError: access denied');
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readStoredThemeValues', () => {
  it('returns both keys when storage works', () => {
    const contents: Record<string, string> = {
      [THEME_STORAGE_KEY]: 'dark',
      [THEME_LEGACY_STORAGE_KEY]: 'light',
    };
    stubStorage({
      getItem: (key: string) => contents[key] ?? null,
      setItem: () => {},
    });

    expect(readStoredThemeValues()).toEqual({
      stored: 'dark',
      legacyStored: 'light',
    });
  });

  it('reports nothing stored rather than throwing when storage throws', () => {
    stubStorage(throwingStorage);

    // The point of the guard: this is called from a render-time `useState`
    // initializer, where a throw would take down the whole React tree.
    expect(() => readStoredThemeValues()).not.toThrow();
    expect(readStoredThemeValues()).toEqual({
      stored: null,
      legacyStored: null,
    });
  });

  it('survives a window whose localStorage getter itself throws', () => {
    vi.stubGlobal('window', inaccessibleStorageWindow);

    expect(readStoredThemeValues()).toEqual({
      stored: null,
      legacyStored: null,
    });
  });

  it('reports nothing stored when there is no window at all (SSR)', () => {
    expect(readStoredThemeValues()).toEqual({
      stored: null,
      legacyStored: null,
    });
  });
});

describe('writeStoredThemeMode', () => {
  it('writes the mode to both keys', () => {
    const written: Record<string, string> = {};
    stubStorage({
      getItem: () => null,
      setItem: (key: string, value: string) => {
        written[key] = value;
      },
    });

    writeStoredThemeMode('dark');

    expect(written).toEqual({
      [THEME_STORAGE_KEY]: 'dark',
      [THEME_LEGACY_STORAGE_KEY]: 'dark',
    });
  });

  it('swallows a throwing write so the caller still applies the theme', () => {
    stubStorage(throwingStorage);

    // `ThemeProvider` flips `<html>` immediately after this call; if the write
    // threw, the effect would abort and the page would keep the old theme.
    expect(() => writeStoredThemeMode('dark')).not.toThrow();
  });

  it('no-ops without a window (SSR)', () => {
    expect(() => writeStoredThemeMode('light')).not.toThrow();
  });
});
