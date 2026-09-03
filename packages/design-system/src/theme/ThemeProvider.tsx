import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  isThemeMode,
  readStoredThemeValues,
  writeStoredThemeMode,
} from './theme-storage.js';
import { ThemeContext, type ThemeMode } from './useTheme.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Runs during render (a `useState` initializer), so it must not throw —
 * `readStoredThemeValues` owns the storage guard.
 */
function readInitialThemeMode(): ThemeMode {
  const { stored, legacyStored } = readStoredThemeValues();
  const value = stored ?? legacyStored;

  return isThemeMode(value) ? value : 'auto';
}

/**
 * In `'auto'` mode the pre-paint bootstrap (`THEME_BOOTSTRAP_SCRIPT`) has
 * already stamped the resolved system preference onto `<html data-theme>`, so
 * reading it back keeps the provider's first render in agreement with what the
 * user is already looking at. That agreement is what stops a hydrated page from
 * flashing: server-rendered markup has no `matchMedia` to consult, so without
 * this the provider's first client commit would reset `<html>` to light.
 *
 * Only consulted for `'auto'` — under an explicit `'light'`/`'dark'` the stamped
 * attribute reflects that choice, not the system preference, and seeding from it
 * would corrupt the value the user sees after switching back to `'auto'`. Falls
 * back to `matchMedia` whenever no bootstrap ran, so behavior is unchanged
 * without one.
 *
 * Exported (but not re-exported from `index.ts`/the package root) so
 * `ThemeProvider.test.ts` can assert the "explicit mode never consults the
 * stamp" half directly: under an explicit mode the seeded value is invisible in
 * the first render's `isDark` (the mode alone decides that) and by the time a
 * mode switch could reveal it the store below has already overwritten it from
 * `matchMedia`.
 */
export function readSystemPrefersDark(mode: ThemeMode): boolean {
  if (!isBrowser()) {
    return false;
  }

  if (mode === 'auto') {
    const appliedTheme = document.documentElement.dataset.theme;
    if (appliedTheme === 'dark' || appliedTheme === 'light') {
      return appliedTheme === 'dark';
    }
  }

  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * The system colour-scheme preference, as an external store.
 *
 * It is one: a browser-owned value that changes on its own schedule, which is
 * exactly what `useSyncExternalStore` subscribes React to. Modelling it that
 * way — rather than as state seeded in a `useState` initializer and corrected
 * from a mount effect — keeps the seeding described above intact while removing
 * the mount-time `setState`.
 *
 * The two halves it has to reconcile:
 *
 * - The FIRST read must be `readSystemPrefersDark`, not a bare `matchMedia`
 *   read, or the anti-flash seeding is gone: on a hydrated page the first
 *   commit would reset `<html>` to whatever `matchMedia` says (light, when
 *   there is no `matchMedia` answer worth having yet) instead of agreeing with
 *   the stamp the user is already looking at. Hence the lazy `current`, which
 *   makes the seed the store's initial snapshot rather than something layered
 *   on top of it.
 * - Every read AFTER the listener is attached must be the live `matchMedia`
 *   answer. `subscribe` therefore re-reads on attach: the seed was resolved
 *   before paint, and a preference that changed between then and mount would
 *   otherwise go unnoticed until the next change event. React compares the
 *   snapshot it rendered with the one it finds after subscribing and re-renders
 *   on a difference, which is precisely what the old mount effect did by hand.
 *
 * One store per provider (held in `useState`, so it is created once): the seed
 * depends on the provider's own initial `mode`, and a module-level singleton
 * would hand a later provider — or the next test — a value seeded for someone
 * else's document.
 */
function createSystemPreferenceStore(mode: ThemeMode): {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => boolean;
} {
  let current: boolean | null = null;

  return {
    getSnapshot: () => {
      current ??= readSystemPrefersDark(mode);
      return current;
    },
    subscribe: (onStoreChange) => {
      if (!isBrowser()) {
        return () => {};
      }

      const media = window.matchMedia(DARK_QUERY);

      const handleChange = (event: MediaQueryListEvent) => {
        current = event.matches;
        onStoreChange();
      };

      current = media.matches;

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
      }

      media.addListener(handleChange);
      return () => media.removeListener(handleChange);
    },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialThemeMode);
  const [systemPreference] = useState(() => createSystemPreferenceStore(mode));
  // The same function serves as the server snapshot: it already answers `false`
  // without a `window`, and on the client — including the hydration render —
  // it answers with the bootstrap's stamp, which is the whole point.
  const systemPrefersDark = useSyncExternalStore(
    systemPreference.subscribe,
    systemPreference.getSnapshot,
    systemPreference.getSnapshot,
  );
  const isApplyingThemeRef = useRef(false);

  const isDark = mode === 'dark' || (mode === 'auto' && systemPrefersDark);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    isApplyingThemeRef.current = true;
    // Best-effort, and guarded: a storage throw here must not skip the
    // class/attribute flip below or the page keeps the previous theme.
    writeStoredThemeMode(mode);

    const effectiveTheme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = effectiveTheme;

    queueMicrotask(() => {
      isApplyingThemeRef.current = false;
    });
  }, [isDark, mode]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const onExternalThemeChange = () => {
      if (isApplyingThemeRef.current) {
        return;
      }

      const documentTheme = document.documentElement.getAttribute('data-theme');
      if (documentTheme === 'light' || documentTheme === 'dark') {
        setModeState((current) =>
          current === documentTheme ? current : documentTheme,
        );
      }
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === 'attributes' &&
          record.attributeName === 'data-theme'
        ) {
          onExternalThemeChange();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      setMode: (nextMode: ThemeMode) => setModeState(nextMode),
    }),
    [isDark, mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
