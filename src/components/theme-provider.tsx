"use client";

import * as React from 'react';

type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = 'swapunits-theme';

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const getStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.warn('[swapunits] Unable to read theme preference from storage.', error);
  }

  return 'system';
};

const applyThemeClass = (preference: ThemePreference, mediaQuery: MediaQueryList) => {
  const isDark = preference === 'dark' || (preference === 'system' && mediaQuery.matches);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.themePreference = preference;
  return isDark ? 'dark' : 'light';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [theme, setTheme] = React.useState<Theme>('light');

  React.useEffect(() => {
    setPreferenceState(getStoredPreference());
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const resolved = applyThemeClass(preference, mediaQuery);
      setTheme(resolved);
    };

    updateTheme();

    const handleSystemChange = () => {
      if (preference === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [preference]);

  const setPreference = React.useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextPreference);
      } catch (error) {
        console.warn('[swapunits] Unable to save theme preference to storage.', error);
      }
    }
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      preference,
      setPreference,
    }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
