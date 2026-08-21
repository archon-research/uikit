import { type ThemeMode } from './useTheme.js';

/**
 * The storage contract shared by `ThemeProvider` and the pre-paint theme
 * bootstrap. Both must read and write the *same* keys or a reload applies one
 * theme before paint and a different one after hydration — the exact flash the
 * bootstrap exists to remove. They live here, in one module with no React
 * import, so the two cannot drift and so the bootstrap can be generated from
 * these values rather than restating them.
 */
export const THEME_STORAGE_KEY = 'theme';

/** Pre-rename key, still read (never solely written) so old clients survive. */
export const THEME_LEGACY_STORAGE_KEY = 'archon-theme';

/** Narrows an arbitrary stored string to a `ThemeMode`. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto';
}

/**
 * Reads both theme keys, and NEVER throws.
 *
 * Touching `window.localStorage` can throw outright rather than return `null`:
 * Safari private mode, cookies disabled, or a storage-partitioned iframe all
 * raise on access. `ThemeProvider` reads these during render (a `useState`
 * initializer), where an unguarded throw takes down the whole tree rather than
 * degrading to the default theme — so the guard lives here, in the one module
 * both readers already share, instead of at each call site.
 *
 * Returns `null` for both values when storage is unavailable, which callers
 * already treat as "nothing stored" and resolve to `'auto'`.
 */
export function readStoredThemeValues(): {
  stored: string | null;
  legacyStored: string | null;
} {
  if (typeof window === 'undefined') {
    return { stored: null, legacyStored: null };
  }

  try {
    return {
      stored: window.localStorage.getItem(THEME_STORAGE_KEY),
      legacyStored: window.localStorage.getItem(THEME_LEGACY_STORAGE_KEY),
    };
  } catch {
    return { stored: null, legacyStored: null };
  }
}

/**
 * Best-effort persist of the chosen mode to both keys, and NEVER throws.
 *
 * Same storage hazards as {@link readStoredThemeValues}, plus Safari private
 * mode's zero quota, which throws on write specifically. Persisting the choice
 * is best-effort; APPLYING it is not — so a failed write must not abort the
 * caller before it flips `<html>`, or the page would keep rendering the
 * previous theme for the rest of the session.
 */
export function writeStoredThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    window.localStorage.setItem(THEME_LEGACY_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable or over quota. The theme still applies for this
    // session; it just will not survive a reload.
  }
}
