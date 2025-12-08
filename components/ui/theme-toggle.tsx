'use client';

import { useTheme } from '@/lib/contexts/theme-context';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@heroui/react';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export function ThemeToggle({ showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={cycleTheme}
      className={showLabel ? "gap-2 flex items-center w-full justify-start" : "flex items-center justify-center min-w-0 px-2"}
      aria-label={`Switch theme (current: ${getLabel()})`}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </Button>
  );
}
