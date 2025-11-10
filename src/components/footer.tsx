
'use client'; // Convert to client component for useEffect and useState

import * as React from 'react';
import { CryptoTipDialog } from '@/components/crypto-tip-dialog';
import { FeatureRequestDialog } from '@/components/feature-request-dialog';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [visitCount, setVisitCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    // Ensure this code runs only on the client
    if (typeof window === 'undefined') {
      return;
    }

    let count = 0;
    try {
      const storedCount = window.localStorage.getItem('swapUnitsVisitCount'); // Changed localStorage key
      count = storedCount ? parseInt(storedCount, 10) : 0;
      if (Number.isNaN(count)) {
        count = 0; // Reset if parsing fails
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
      count = 0; // Fallback if localStorage is restricted or fails
    }

    // Increment count for the new visit
    const newCount = count + 1;

    React.startTransition(() => {
      setVisitCount(newCount);
    });

    try {
      window.localStorage.setItem('swapUnitsVisitCount', String(newCount)); // Changed localStorage key
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      // Continue without storing if localStorage fails
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <footer className="mt-auto w-full border-t border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              &copy; {currentYear} SwapUnits.com · Built for precise, everyday conversions.
            </p>
            <div className="flex items-center space-x-4">
              <CryptoTipDialog />
              <FeatureRequestDialog />
            </div>
            <p>
              Your history, favorites, and formatting preferences stay local to your device so you can focus on results—not settings.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              <span className="rounded-full bg-[hsl(var(--control-background))]/70 px-3 py-1 text-foreground">No sign-up</span>
              <span className="rounded-full bg-[hsl(var(--control-background))]/70 px-3 py-1 text-foreground">14+ categories</span>
              <span className="rounded-full bg-[hsl(var(--control-background))]/70 px-3 py-1 text-foreground">Offline ready</span>
            </div>
          </div>

          <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-3xl border border-border/70 bg-[hsl(var(--control-background))] px-6 py-5 text-center text-sm font-medium text-foreground shadow-[0_14px_45px_-35px_rgba(79,70,229,0.55)]">
            <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Sessions tracked</span>
            <span className="text-2xl font-semibold text-foreground">
              {visitCount !== null ? visitCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-muted-foreground">Stored locally on this browser</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
