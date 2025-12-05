
'use client'; // Convert to client component for useEffect and useState

import * as React from 'react';
import { Github, ArrowUpRight, Chrome } from 'lucide-react';
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
              &copy; {currentYear} SwapUnits.com · Built for precise, everyday conversions. Open source.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CryptoTipDialog />
              <FeatureRequestDialog />
              <a
                href="/extensions/chrome.crx"
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-[hsl(var(--control-background))]/80 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
              >
                <Chrome className="h-4 w-4" aria-hidden="true" />
                Chrome
              </a>
              <a
                href="/extensions/firefox.crx"
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-[hsl(var(--control-background))]/80 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.896 5.896 0 012.008-.523l.067-.005a5.885 5.885 0 011.957.222l.095.03a5.657 5.657 0 01.616.228c.08.036.16.073.238.112l.107.055a5.543 5.543 0 01.507.312l.095.065c.183.133.358.278.525.437l.058.055c.12.114.234.236.34.364l.067.081a5.753 5.753 0 01.528.82l.05.104c.074.167.14.338.197.512l.032.104c.044.164.08.331.107.501l.014.094c.018.133.03.268.036.403l.003.098c.001.054.002.109.002.164l.001.123v.093a6.024 6.024 0 01-.103.958l-.024.137a6.056 6.056 0 01-.277.87l-.036.09a5.973 5.973 0 01-.407.733l-.05.079a5.886 5.886 0 01-3.048 2.166c.273.395.618.817 1.048 1.263l.066.067c.207.2.424.396.65.589l.081.068c.185.157.38.31.586.46l.104.076c.185.131.381.258.588.382l.112.067c.207.122.425.239.655.35l.114.055c.215.099.44.19.674.269l.127.044c.239.082.495.156.766.224l.14.034c.267.06.55.108.85.138l.135.018c.262.027.536.041.822.041.086 0 .171-.001.256-.003l.117-.003c.285-.009.579-.033.88-.071l.123-.015c.272-.035.554-.083.844-.15l.122-.03c.248-.058.509-.131.781-.221l.117-.04c.263-.092.54-.198.827-.324l.114-.05c.28-.126.578-.276.887-.456l.115-.068c.285-.164.592-.356.912-.576l.115-.08c.321-.227.668-.49 1.035-.796l.117-.1c.336-.291.701-.614 1.086-.975l.126-.121c.378-.368.789-.781 1.23-1.242l.034-.036c.443-.468.92-.984 1.428-1.554l.036-.043c.52-.586 1.071-1.228 1.656-1.938l.007-.009c.027-.032.054-.064.081-.097l.012-.015.02-.023.018-.021.028-.032.024-.028.032-.037.028-.031.037-.044.031-.036.044-.05.035-.04.05-.058.037-.042.056-.066.039-.045.062-.073.043-.05.065-.077.046-.053.07-.082.05-.058.076-.087.054-.063.081-.093.058-.068.086-.099.063-.073.092-.106.067-.078.1-.114.071-.082.105-.119.075-.086.112-.128.08-.092.116-.13.085-.096.122-.137.09-.102.128-.143.095-.106.134-.149.099-.11.142-.157.104-.115.149-.164.108-.118.158-.172.113-.123.166-.18.118-.128.177-.19.124-.133.186-.198.13-.138.198-.21.137-.143.209-.217.143-.149.22-.227.15-.153.233-.238.157-.159.248-.249.166-.166.264-.261.174-.173.285-.277.185-.183.309-.3.198-.193.34-.326.018-.017.017-.016.007-.007.002-.002a17.74 17.74 0 012.01-1.577c.006-.004.008-.007.01-.01.237-.178.48-.348.733-.519.017-.012.034-.024.05-.036.22-.148.446-.288.68-.423.022-.013.044-.026.066-.038.226-.131.46-.254.703-.373.027-.013.054-.026.081-.04.241-.115.49-.223.748-.324.029-.012.058-.023.088-.034.257-.097.525-.187.8-.269.032-.01.063-.019.095-.028.281-.084.572-.16.873-.227.035-.008.07-.015.105-.023.302-.065.614-.123.937-.17.039-.006.079-.011.118-.016.325-.044.659-.079 1.003-.102.043-.003.087-.006.13-.008.345-.022.697-.035 1.06-.037h.015z"/>
                </svg>
                Firefox
              </a>
              <a
                href="/widget-builder"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-[hsl(var(--control-background))]/80 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                Build widget
              </a>
              <a
                href="https://github.com/Bugierek/SwapUnitsWebApp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-[hsl(var(--control-background))]/80 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
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

          <div className="flex w-full max-w-full md:max-w-[280px] lg:max-w-xs flex-col items-center gap-2 rounded-3xl border border-border/70 bg-[hsl(var(--control-background))] px-6 py-5 text-center text-sm font-medium text-foreground shadow-[0_14px_45px_-35px_rgba(79,70,229,0.55)]">
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
