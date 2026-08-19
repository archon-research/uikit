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
