'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { preferencesService } from '@/lib/services/preferences-service';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from user preferences or localStorage
  useEffect(() => {
    const loadTheme = async () => {
      if (user) {
        // Load from user preferences
        try {
          const prefs = await preferencesService.getPreferences(user.id);
          const savedTheme = (prefs?.theme as Theme) || 'dark';
          setThemeState(savedTheme);
        } catch (error) {
          console.error('Failed to load theme preference:', error);
          const localTheme = (localStorage.getItem('theme') as Theme) || 'dark';
          setThemeState(localTheme);
        }
      } else {
        // Load from localStorage for non-authenticated users
        const localTheme = (localStorage.getItem('theme') as Theme) || 'dark';
        setThemeState(localTheme);
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user]);

  // Resolve system theme
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        setResolvedTheme(systemTheme);
      } else {
        setResolvedTheme(theme);
      }
    };

    resolveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        resolveTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // Save to user preferences if authenticated
    if (user) {
      try {
        await preferencesService.updatePreferences(user.id, { theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
