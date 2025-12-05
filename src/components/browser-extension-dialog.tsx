'use client';

import * as React from 'react';
import { Chrome, X, Puzzle } from 'lucide-react';
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
            <h3 className="text-sm font-semibold text-foreground">✨ Key Features</h3>
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
            <h3 className="mb-1.5 text-sm font-semibold text-foreground">🚀 How It Works</h3>
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
            <h3 className="text-sm font-semibold text-foreground">📥 Download Extension</h3>
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
                <svg
                  className="h-8 w-8 text-foreground transition group-hover:text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.896 5.896 0 012.008-.523l.067-.005a5.885 5.885 0 011.957.222l.095.03a5.657 5.657 0 01.616.228c.08.036.16.073.238.112l.107.055a5.543 5.543 0 01.507.312l.095.065c.183.133.358.278.525.437l.058.055c.12.114.234.236.34.364l.067.081a5.753 5.753 0 01.528.82l.05.104c.074.167.14.338.197.512l.032.104c.044.164.08.331.107.501l.014.094c.018.133.03.268.036.403l.003.098c.001.054.002.109.002.164l.001.123v.093a6.024 6.024 0 01-.103.958l-.024.137a6.056 6.056 0 01-.277.87l-.036.09a5.973 5.973 0 01-.407.733l-.05.079a5.886 5.886 0 01-3.048 2.166c.273.395.618.817 1.048 1.263l.066.067c.207.2.424.396.65.589l.081.068c.185.157.38.31.586.46l.104.076c.185.131.381.258.588.382l.112.067c.207.122.425.239.655.35l.114.055c.215.099.44.19.674.269l.127.044c.239.082.495.156.766.224l.14.034c.267.06.55.108.85.138l.135.018c.262.027.536.041.822.041.086 0 .171-.001.256-.003l.117-.003c.285-.009.579-.033.88-.071l.123-.015c.272-.035.554-.083.844-.15l.122-.03c.248-.058.509-.131.781-.221l.117-.04c.263-.092.54-.198.827-.324l.114-.05c.28-.126.578-.276.887-.456l.115-.068c.285-.164.592-.356.912-.576l.115-.08c.321-.227.668-.49 1.035-.796l.117-.1c.336-.291.701-.614 1.086-.975l.126-.121c.378-.368.789-.781 1.23-1.242l.034-.036c.443-.468.92-.984 1.428-1.554l.036-.043c.52-.586 1.071-1.228 1.656-1.938l.007-.009c.027-.032.054-.064.081-.097l.012-.015.02-.023.018-.021.028-.032.024-.028.032-.037.028-.031.037-.044.031-.036.044-.05.035-.04.05-.058.037-.042.056-.066.039-.045.062-.073.043-.05.065-.077.046-.053.07-.082.05-.058.076-.087.054-.063.081-.093.058-.068.086-.099.063-.073.092-.106.067-.078.1-.114.071-.082.105-.119.075-.086.112-.128.08-.092.116-.13.085-.096.122-.137.09-.102.128-.143.095-.106.134-.149.099-.11.142-.157.104-.115.149-.164.108-.118.158-.172.113-.123.166-.18.118-.128.177-.19.124-.133.186-.198.13-.138.198-.21.137-.143.209-.217.143-.149.22-.227.15-.153.233-.238.157-.159.248-.249.166-.166.264-.261.174-.173.285-.277.185-.183.309-.3.198-.193.34-.326.018-.017.017-.016.007-.007.002-.002a17.74 17.74 0 012.01-1.577c.006-.004.008-.007.01-.01.237-.178.48-.348.733-.519.017-.012.034-.024.05-.036.22-.148.446-.288.68-.423.022-.013.044-.026.066-.038.226-.131.46-.254.703-.373.027-.013.054-.026.081-.04.241-.115.49-.223.748-.324.029-.012.058-.023.088-.034.257-.097.525-.187.8-.269.032-.01.063-.019.095-.028.281-.084.572-.16.873-.227.035-.008.07-.015.105-.023.302-.065.614-.123.937-.17.039-.006.079-.011.118-.016.325-.044.659-.079 1.003-.102.043-.003.087-.006.13-.008.345-.022.697-.035 1.06-.037h.015z" />
                </svg>
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
            <p className="text-[10px] text-muted-foreground text-center">
              💡 <strong>Note:</strong> Chrome Web Store version coming soon! Currently available as manual download.
            </p>
          </div>

          {/* Privacy Note - More Compact */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
            <p className="text-[10px] text-muted-foreground">
              🔒 <strong>Privacy:</strong> No personal data collected. All preferences stored locally. 
              Only currency conversions use an external API (exchangerate-api.com) for live rates.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
