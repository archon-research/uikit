import {
  THEME_LEGACY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isThemeMode,
  readStoredThemeValues,
} from './theme-storage.js';
import { type ThemeMode } from './useTheme.js';

/**
 * The theme decision, shared by every entry point below and by the generated
 * script string. Pure: hand it what was read, get back what to apply.
 */
export function resolveBootstrapTheme(input: {
  stored: string | null;
  legacyStored: string | null;
  prefersDark: boolean;
}): { mode: ThemeMode; isDark: boolean } {
  const value = input.stored ?? input.legacyStored;
  const mode: ThemeMode = isThemeMode(value) ? value : 'auto';
  const isDark = mode === 'dark' || (mode === 'auto' && input.prefersDark);
  return { mode, isDark };
}

/** Applies `dark` class + `data-theme` for a resolved decision. */
function applyResolvedTheme(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
}

/**
 * Applies the stored theme to `<html>` immediately, for consumers who can run
 * JS before first paint some other way than an inline `<script>` (a bundled
 * entry that runs before React mounts, a framework's pre-render hook). Same
 * decision and same storage keys as `THEME_BOOTSTRAP_SCRIPT`.
 *
 * Safe to call in a non-browser context (it no-ops) and safe when storage is
 * unavailable (Safari private mode, cookies disabled), where it falls back to
 * `prefers-color-scheme`.
 */
export function applyThemeBootstrap(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const { stored, legacyStored } = readStoredThemeValues();

  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  applyResolvedTheme(
    resolveBootstrapTheme({ stored, legacyStored, prefersDark }).isDark,
  );
}

/**
 * The same logic as a self-contained, ES5-syntax IIFE, for injection as an
 * inline `<script>` in the document `<head>` — before any stylesheet paints, so
 * a dark-mode reload never flashes light.
 *
 * The storage keys are interpolated from the shared constants rather than
 * written out again, so this string cannot drift from `ThemeProvider`.
 *
 * Deliberately ES5 syntax (`var`, `function`, no optional chaining) and
 * deliberately wrapped in `try`/`catch`: it runs before any bundle or polyfill,
 * un-transpiled, and must never be the reason a page fails to render. Consumers
 * under a `script-src 'self'` CSP cannot inline it — they copy the prebuilt
 * `dist/theme-bootstrap.js` and load it with `<script src>` instead. See the
 * package README.
 */
export const THEME_BOOTSTRAP_SCRIPT: string = `(function () {
  try {
    var stored = null;
    try {
      var storage = window.localStorage;
      stored = storage.getItem('${THEME_STORAGE_KEY}');
      if (stored === null) {
        stored = storage.getItem('${THEME_LEGACY_STORAGE_KEY}');
      }
    } catch (storageError) {}
    var mode =
      stored === 'light' || stored === 'dark' || stored === 'auto'
        ? stored
        : 'auto';
    var isDark =
      mode === 'dark' ||
      (mode === 'auto' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.theme = isDark ? 'dark' : 'light';
  } catch (error) {}
})();
`;
