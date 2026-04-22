export type ThemeMode = 'auto' | 'light' | 'dark';

export type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

export declare function useTheme(): ThemeContextValue;
