'use client';

import * as React from 'react';
import { Chrome, Puzzle, Flame, Sparkles, Zap, Download, Lightbulb, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function BrowserExtensionDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-[hsl(var(--control-background))]/80 px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary">
          <Puzzle className="h-4 w-4" aria-hidden="true" />
          Browser Extension
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Puzzle className="h-5 w-5 text-primary" />
            SwapUnits Browser Extension
          </DialogTitle>
          <DialogDescription>
            Convert units instantly by selecting text on any webpage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Features Section - Condensed */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Key Features
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">•</span>
                <span><strong>Auto-Detection:</strong> Select text with units (e.g., "30 USD", "5 km", "72°F") and see instant conversions</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">•</span>
                <span><strong>Smart Defaults:</strong> Automatically converts to your preferred units (USD→EUR, km→miles)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">•</span>
                <span><strong>7+ Categories:</strong> Currency (42+ live rates), Length, Mass, Temperature, Volume, Area, Speed</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">•</span>
                <span><strong>Dark Mode:</strong> Beautiful light and dark themes that match your browser</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">•</span>
                <span><strong>Privacy First:</strong> No data collection, works offline (except currencies)</span>
              </li>
            </ul>
          </div>

          {/* How It Works - Condensed */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              How It Works
            </h3>
            <ol className="space-y-0.5 text-xs text-muted-foreground">
              <li>1. Install the extension for your browser</li>
              <li>2. Select text with units on any webpage</li>
              <li>3. See instant conversion in a tooltip</li>
              <li>4. Click settings to change target unit</li>
              <li>5. Your preferences are remembered!</li>
            </ol>
          </div>

          {/* Download Buttons - More Compact */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Download className="h-4 w-4 text-primary" />
              Download Extension
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Chrome Button */}
              <a
                href="/extensions/chrome.crx"
                download
                className="group relative flex flex-col items-center gap-2 rounded-lg border-2 border-border/60 bg-background p-3 transition hover:border-primary/60 hover:bg-primary/5"
              >
                <Chrome className="h-8 w-8 text-foreground transition group-hover:text-primary" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground">Chrome Extension</div>
                  <div className="text-xs text-muted-foreground">
                    Also works on Edge, Brave
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <span>Download for Chrome</span>
                </Button>
              </a>

              {/* Firefox Button */}
              <a
                href="/extensions/firefox.crx"
                download
                className="group relative flex flex-col items-center gap-2 rounded-lg border-2 border-border/60 bg-background p-3 transition hover:border-primary/60 hover:bg-primary/5"
              >
                <Flame className="h-8 w-8 text-foreground transition group-hover:text-primary" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground">Firefox Extension</div>
                  <div className="text-xs text-muted-foreground">
                    For Firefox & derivatives
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <span>Download for Firefox</span>
                </Button>
              </a>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Lightbulb className="h-3 w-3 text-primary" />
              <span><strong>Note:</strong> Chrome Web Store version coming soon! Currently available as manual download.</span>
            </p>
          </div>

          {/* Privacy Note - More Compact */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3 text-primary" />
              <span><strong>Privacy:</strong> No personal data collected. All preferences stored locally. Only currency conversions use an external API (exchangerate-api.com) for live rates.</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
