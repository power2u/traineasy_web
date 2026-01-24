'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useThemeSync } from '@/lib/hooks/use-theme-sync';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useThemeSync();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

// Re-export useTheme for compatibility
export { useTheme } from 'next-themes';
