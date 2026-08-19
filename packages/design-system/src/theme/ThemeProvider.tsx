import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  THEME_LEGACY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isThemeMode,
} from './theme-storage.js';
import { ThemeContext, type ThemeMode } from './useTheme.js';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readInitialThemeMode(): ThemeMode {
  if (!isBrowser()) {
    return 'auto';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  const legacyStored = window.localStorage.getItem(THEME_LEGACY_STORAGE_KEY);
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
 */
function readSystemPrefersDark(mode: ThemeMode): boolean {
  if (!isBrowser()) {
    return false;
  }

  if (mode === 'auto') {
    const appliedTheme = document.documentElement.dataset.theme;
    if (appliedTheme === 'dark' || appliedTheme === 'light') {
      return appliedTheme === 'dark';
    }
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    readSystemPrefersDark(mode),
  );
  const isApplyingThemeRef = useRef(false);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(media.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const isDark = mode === 'dark' || (mode === 'auto' && systemPrefersDark);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    isApplyingThemeRef.current = true;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    window.localStorage.setItem(THEME_LEGACY_STORAGE_KEY, mode);

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
