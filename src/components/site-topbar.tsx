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
  ArrowLeftRight,
} from 'lucide-react';

import type { ConversionHistoryItem, FavoriteItem, Preset } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkButton } from '@/components/bookmark-button';
import { UnitIcon } from '@/components/unit-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ResponsiveFavoriteLabel } from '@/components/responsive-favorite-label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

const getHistoryCategoryLabel = (item: ConversionHistoryItem): string => {
  if (item.meta?.kind === 'si-prefix') {
    return 'SI prefix scaling';
  }
  if (item.category === 'SI Prefixes') {
    return 'SI prefix scaling';
  }
  return item.category;
};

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
  const [isHistoryConfirmOpen, setIsHistoryConfirmOpen] = React.useState(false);
  const [isFavoritesConfirmOpen, setIsFavoritesConfirmOpen] = React.useState(false);
  const LABEL_CHAR_LIMIT = 36;

  const handleConfirmClearHistory = React.useCallback(() => {
    clearHistory?.();
    setIsHistoryConfirmOpen(false);
    setIsSheetOpen(false);
  }, [clearHistory]);

  const handleConfirmClearFavorites = React.useCallback(() => {
    onClearAllFavorites?.();
    setIsFavoritesConfirmOpen(false);
    setIsSheetOpen(false);
  }, [onClearAllFavorites]);

  const getFavoriteLabels = React.useCallback((fav: FavoriteItem) => {
    const trimmed = fav.name?.trim() ?? '';
    const full = trimmed.length > 0 ? trimmed : `${fav.fromUnit} → ${fav.toUnit}`;
    const compact = `${fav.fromUnit} → ${fav.toUnit}`;
    return { full, compact };
  }, []);

  const formatPresetLabel = React.useCallback(
    (preset: Preset) => {
      const trimmed = preset.name?.trim() ?? '';
      if (trimmed.length > 0 && trimmed.length <= LABEL_CHAR_LIMIT) {
        return trimmed;
      }
      return `${preset.fromUnit} → ${preset.toUnit}`;
    },
    [],
  );

  return (
    <header className="sticky top-0 z-[60] border-b border-border/50 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className="xl:hidden rounded-full border border-border/60 bg-[hsl(var(--card))]/90 text-foreground transition hover:bg-[hsl(var(--card))] dark:bg-[hsl(var(--card))]/70 dark:hover:bg-[hsl(var(--card))]/90"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-full max-w-[360px] border-r border-border/60 bg-background/95 p-0 sm:max-w-[400px]"
            >
              <ScrollArea className="h-full">
                <SheetHeader className="border-b border-border/60 px-5 py-4">
                  <SheetTitle className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <List className="h-4 w-4" aria-hidden="true" />
                    Quick Access
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 px-5 pb-16 pt-5 text-sm">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <HistoryIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                        Recent history
                      </span>
                      {history.length > 0 && clearHistory && (
                        <AlertDialog open={isHistoryConfirmOpen} onOpenChange={setIsHistoryConfirmOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Clear history"
                              className="h-8 px-3 text-xs font-semibold"
                            >
                              Clear
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear conversion history?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove all saved conversions from your device. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmClearHistory}>Clear history</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {isLoadingHistory ? (
                      <p className="text-muted-foreground">Loading history…</p>
                    ) : history.length === 0 ? (
                      <p className="text-muted-foreground">Copy a result to store it here.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {history.map((item) => {
                          const isSiPrefix = item.meta?.kind === 'si-prefix';
                          const categoryLabel = getHistoryCategoryLabel(item);
                          return (
                          <li
                            key={item.id}
                            className="group/history-item flex items-start gap-2 rounded-lg px-1 py-1 transition-colors"
                          >
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                className="flex flex-1 items-start gap-3 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground transition group-hover/history-item:bg-primary/10 focus:outline-none focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                                onClick={() => onHistorySelect?.(item)}
                              >
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  {isSiPrefix ? (
                                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <UnitIcon category={item.category} className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 space-y-1 whitespace-normal break-words">
                                  <span className="block text-sm font-semibold leading-snug text-foreground">
                                    {item.fromValue.toLocaleString()} {item.fromUnit} → {item.toValue.toLocaleString()} {item.toUnit}
                                  </span>
                                  <span className="block text-xs leading-tight text-muted-foreground">
                                    {categoryLabel} · {format(new Date(item.timestamp), 'MMM d, p')}
                                  </span>
                                </span>
                              </Button>
                            </SheetClose>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 self-start rounded-full text-primary opacity-100 transition md:opacity-0 md:group-hover/history-item:opacity-100 md:group-focus-within/history-item:opacity-100 hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyHistoryItem?.(item);
                              }}
                              aria-label={`Copy result ${item.fromValue} ${item.fromUnit} to ${item.toUnit}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </li>
                        );})}
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
                        <AlertDialog open={isFavoritesConfirmOpen} onOpenChange={setIsFavoritesConfirmOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Clear favorites"
                              className="h-8 px-3 text-xs font-semibold"
                            >
                              Clear
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove all favorites?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This deletes every saved conversion from your favorites list. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmClearFavorites}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {isLoadingFavorites ? (
                      <p className="text-muted-foreground">Loading favorites…</p>
                    ) : favorites.length === 0 ? (
                      <p className="text-muted-foreground">Save a conversion to reuse it quickly.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {favorites.map((fav) => {
                          const labels = getFavoriteLabels(fav);
                          return (
                          <li
                            key={fav.id}
                            className="group/fav-item flex items-center gap-2 rounded-lg px-1 py-1 transition-colors"
                          >
                            <SheetClose asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10 group-hover/fav-item:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                                onClick={() => onFavoriteSelect?.(fav)}
                                aria-label={`Select favorite: ${labels.full}`}
                                title={labels.full}
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UnitIcon category={fav.category} className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <ResponsiveFavoriteLabel
                                    fullLabel={labels.full}
                                    compactLabel={labels.compact}
                                  />
                                </span>
                              </Button>
                            </SheetClose>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-100 visible transition md:opacity-0 md:invisible md:group-hover/fav-item:visible md:group-hover/fav-item:opacity-100 md:group-focus-within/fav-item:visible md:group-focus-within/fav-item:opacity-100 hover:bg-destructive hover:text-white focus-visible:bg-destructive focus-visible:text-white focus-visible:ring-2 focus-visible:ring-destructive/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFavorite?.(fav.id);
                              }}
                              aria-label={`Remove favorite ${labels.full}`}
                              title={`Remove ${labels.full}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        );})}
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
                      <ul className="space-y-1.5 pb-10">
                        {presets.map((preset, index) => {
                          const displayLabel = formatPresetLabel(preset);
                          return (
                          <li key={`${preset.category}-${preset.name}-${index}`}>
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10"
                                onClick={() => onPresetSelect?.(preset)}
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <UnitIcon category={preset.category} className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis font-semibold text-foreground">
                                  {displayLabel}
                                </span>
                              </Button>
                            </SheetClose>
                          </li>
                        );})}
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
            <RefreshCw className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />
            <span className="font-semibold">SwapUnits</span>
          </Link>
        </div>

        <Link
          href="/"
          onClick={handleLogoClick}
          className="group flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-foreground transition hover:border-primary/60 hover:bg-card/90 md:hidden"
          aria-label="Reset the unit converter to its initial state"
        >
          <RefreshCw className="h-4 w-4 text-primary transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />
          SwapUnits
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Built for accuracy</p>
            <p className="text-sm font-medium text-foreground">History & favorites stay local</p>
          </div>
          <ThemeToggle />
          <BookmarkButton className="pr-3.5 pl-3" />
        </div>
      </div>
    </header>
  );
}
