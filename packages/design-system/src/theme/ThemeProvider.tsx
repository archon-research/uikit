import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { ThemeContext, type ThemeMode } from './useTheme';

const STORAGE_KEY = 'theme';
const LEGACY_STORAGE_KEY = 'archon-theme';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readInitialThemeMode(): ThemeMode {
  if (!isBrowser()) {
    return 'auto';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const legacyStored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const value = stored ?? legacyStored;

  if (value === 'light' || value === 'dark' || value === 'auto') {
    return value;
  }

  return 'auto';
}

function readSystemPrefersDark(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    readSystemPrefersDark,
  );

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

    window.localStorage.setItem(STORAGE_KEY, mode);
    window.localStorage.setItem(LEGACY_STORAGE_KEY, mode);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = mode;
  }, [isDark, mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      setMode: (nextMode: ThemeMode) => setModeState(nextMode),
    }),
    [isDark, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
