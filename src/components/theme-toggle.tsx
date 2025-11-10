"use client";

import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme, type ThemePreference } from '@/components/theme-provider';

export function ThemeToggle() {
  const { preference, theme, setPreference } = useTheme();
  const Icon = theme === 'dark' ? Moon : Sun;

  const computeNextPreference = (): ThemePreference => {
    if (preference === 'system') {
      return theme === 'dark' ? 'light' : 'dark';
    }
    return preference === 'dark' ? 'light' : 'dark';
  };

  const nextPreference = computeNextPreference();
  const nextLabel = nextPreference === 'dark' ? 'Switch to dark mode' : 'Switch to light mode';

  const handleToggle = () => {
    setPreference(nextPreference);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={nextLabel}
      className="h-9 w-9 rounded-full border border-border/70 bg-background text-foreground transition hover:border-primary/60 hover:bg-primary/10"
      onClick={handleToggle}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
