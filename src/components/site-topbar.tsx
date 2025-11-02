"use client";

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Menu,
  RefreshCw,
  List,
  History as HistoryIcon,
  Copy,
  Star,
  X,
} from 'lucide-react';

import type { ConversionHistoryItem, FavoriteItem, Preset } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkButton } from '@/components/bookmark-button';
import { UnitIcon } from '@/components/unit-icon';

type SiteTopbarProps = {
  handleLogoClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  history?: ConversionHistoryItem[];
  isLoadingHistory?: boolean;
  onHistorySelect?: (item: ConversionHistoryItem) => void;
  clearHistory?: () => void;
  onCopyHistoryItem?: (item: ConversionHistoryItem) => void;
  favorites?: FavoriteItem[];
  isLoadingFavorites?: boolean;
  onFavoriteSelect?: (favorite: FavoriteItem) => void;
  onRemoveFavorite?: (id: string) => void;
  onClearAllFavorites?: () => void;
  presets?: (Preset | FavoriteItem)[];
  onPresetSelect?: (preset: Preset | FavoriteItem) => void;
};

const noop = () => {};

export function SiteTopbar({
  handleLogoClick,
  history = [],
  isLoadingHistory = false,
  onHistorySelect,
  clearHistory,
  onCopyHistoryItem,
  favorites = [],
  isLoadingFavorites = false,
  onFavoriteSelect,
  onRemoveFavorite,
  onClearAllFavorites,
  presets = [],
  onPresetSelect,
}: SiteTopbarProps) {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className="lg:hidden rounded-full border border-border/50 bg-white/80 text-foreground transition hover:bg-white"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] border-r border-border/60 bg-background/95 p-0">
              <ScrollArea className="h-full">
                <SheetHeader className="border-b border-border/60 px-5 py-4">
                  <SheetTitle className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <List className="h-4 w-4" aria-hidden="true" />
                    Quick Access
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 px-5 py-5 text-sm">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <HistoryIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                        Recent history
                      </span>
                      {history.length > 0 && clearHistory && (
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearHistory}
                            aria-label="Clear history"
                            className="h-8 px-3 text-xs font-semibold"
                          >
                            Clear
                          </Button>
                        </SheetClose>
                      )}
                    </div>
                    {isLoadingHistory ? (
                      <p className="text-muted-foreground">Loading history…</p>
                    ) : history.length === 0 ? (
                      <p className="text-muted-foreground">Copy a result to store it here.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {history.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-card px-3 py-2"
                          >
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                className="flex flex-1 items-start gap-2 rounded-lg bg-transparent p-0 text-left hover:bg-secondary/60"
                                onClick={() => onHistorySelect?.(item)}
                              >
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UnitIcon category={item.category} className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium text-foreground">
                                    {item.fromValue.toLocaleString()} {item.fromUnit} → {item.toValue.toLocaleString()} {item.toUnit}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {item.category} · {format(new Date(item.timestamp), 'MMM d, p')}
                                  </span>
                                </span>
                              </Button>
                            </SheetClose>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyHistoryItem?.(item);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <Star className="h-5 w-5 text-primary" aria-hidden="true" />
                        Favorites
                      </span>
                      {favorites.length > 0 && onClearAllFavorites && (
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearAllFavorites}
                            aria-label="Clear favorites"
                            className="h-8 px-3 text-xs font-semibold"
                          >
                            Clear
                          </Button>
                        </SheetClose>
                      )}
                    </div>
                    {isLoadingFavorites ? (
                      <p className="text-muted-foreground">Loading favorites…</p>
                    ) : favorites.length === 0 ? (
                      <p className="text-muted-foreground">Save a conversion to reuse it quickly.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {favorites.map((fav) => (
                          <li
                            key={fav.id}
                            className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-card px-3 py-2"
                          >
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                className="flex flex-1 items-center gap-2 rounded-lg bg-transparent p-0 text-left hover:bg-secondary/60"
                                onClick={() => onFavoriteSelect?.(fav)}
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UnitIcon category={fav.category} className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="flex-1 truncate text-sm font-medium text-foreground">{fav.name}</span>
                              </Button>
                            </SheetClose>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFavorite?.(fav.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="space-y-2">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <List className="h-5 w-5 text-primary" aria-hidden="true" />
                      Common conversions
                    </span>
                    {presets.length === 0 ? (
                      <p className="text-muted-foreground">No suggestions at the moment.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {presets.map((preset, index) => (
                          <li key={`${preset.category}-${preset.name}-${index}`}>
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-left hover:bg-secondary/60"
                                onClick={() => onPresetSelect?.(preset)}
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UnitIcon category={preset.category} className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="flex-1 text-sm font-medium text-foreground">{preset.name}</span>
                              </Button>
                            </SheetClose>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            onClick={handleLogoClick}
            className="group hidden items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-foreground md:flex"
            aria-label="Reset the unit converter to its initial state"
          >
            <RefreshCw className="h-5 w-5 text-primary transition-transform duration-300 group-hover:-rotate-180" aria-hidden="true" />
            <span className="font-semibold">SwapUnits</span>
          </Link>
        </div>

        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-foreground transition hover:border-primary/60 hover:bg-card/90 lg:hidden"
          aria-label="Reset the unit converter to its initial state"
        >
          <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
          SwapUnits
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Built for accuracy</p>
            <p className="text-sm font-medium text-foreground">History & favorites stay local</p>
          </div>
          <BookmarkButton />
        </div>
      </div>
    </header>
  );
}
