
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed: import { getFilteredAndSortedPresets } from "@/lib/unit-data"; 
import type { FavoriteItem } from '@/types'; 
import { Star, X } from 'lucide-react';
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";
import { Progress } from '@/components/ui/progress';
import { ResponsiveFavoriteLabel } from '@/components/responsive-favorite-label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PresetListProps {
    favorites: FavoriteItem[];
    onFavoriteSelect: (favorite: FavoriteItem) => void;
    onRemoveFavorite: (favoriteId: string) => void;
    onClearAllFavorites?: () => void; 
    className?: string; 
    isLoadingFavorites?: boolean; 
}

export const PresetList = React.memo(function PresetListComponent({ 
    favorites,
    onFavoriteSelect,
    onRemoveFavorite,
    onClearAllFavorites,
    className,
    isLoadingFavorites 
}: PresetListProps) {
    const [isClearFavoritesDialogOpen, setIsClearFavoritesDialogOpen] = React.useState(false);
    // Removed: const displayPresets = getFilteredAndSortedPresets(); 

    const getFavoriteLabels = React.useCallback((fav: FavoriteItem) => {
        const trimmed = fav.name?.trim() ?? '';
        const full = trimmed.length > 0 ? trimmed : `${fav.fromUnit} → ${fav.toUnit}`;
        const compact = `${fav.fromUnit} → ${fav.toUnit}`;
        return { full, compact };
    }, []);

    return (
        <Card className={cn("group flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm max-h-[520px] xl:max-h-[calc(100vh-240px)] h-auto", className)} aria-label="Favorite and Common Unit Conversions">
            {/* My Favorites Section */}
            <CardHeader className="flex-shrink-0 border-b border-border/60 px-[1.125rem] py-[0.8rem]">
                 <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Star className="h-3 w-3" aria-hidden="true" />
                        </span>
                        Saved favorites
                    </CardTitle>
                                        {onClearAllFavorites && favorites.length > 0 && !isLoadingFavorites && (
                                                <>
                                                    <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setIsClearFavoritesDialogOpen(true)}
                                                            aria-label="Clear all favorites"
                                                            className="h-8 rounded-full border-border/60 bg-transparent px-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground opacity-0 transition hover:border-primary/50 hover:text-primary hover:bg-[hsl(var(--control-background))] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                                                    >
                                                            Clear all
                                                    </Button>

                                                    <AlertDialog open={isClearFavoritesDialogOpen} onOpenChange={setIsClearFavoritesDialogOpen}>
                                                        <AlertDialogContent className="rounded-2xl border border-border/60 bg-card shadow-xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Clear all favorites?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will remove all saved favorite conversions. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                                <AlertDialogCancel className="rounded-lg border-border/60 bg-[hsl(var(--control-background))]">
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="rounded-lg"
                                                                    onClick={() => {
                                                                        onClearAllFavorites?.();
                                                                        setIsClearFavoritesDialogOpen(false);
                                                                    }}
                                                                >
                                                                    Yes, clear
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                        )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow px-[1.125rem] pb-[0.65rem] pt-[0.75rem]">
                {isLoadingFavorites ? (
                     <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-[0.9rem] py-[1.125rem] text-center">
                        <p className="text-sm font-medium text-muted-foreground">Loading your saved conversions…</p>
                        <Progress value={50} className="h-1.5 w-full rounded-full bg-secondary" aria-label="Loading progress" />
                    </div>
                ): favorites.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-[hsl(var(--control-background))] px-[0.9rem] py-[1.8rem] text-center">
                        <p className="text-sm font-semibold text-foreground">No favorites yet</p>
                        <p className="text-xs text-muted-foreground">Save a conversion from the main panel to build your list.</p>
                    </div>
                ) : (
                    <ScrollArea
                      className="max-h-[260px] pr-3 overflow-y-auto scrollbar-thin transition-[background-color] duration-200 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-border/60 group-hover:[&::-webkit-scrollbar-thumb]:bg-border/60"
                    >
                    <div className="space-y-1">
                        <ul className="space-y-1">
                            {favorites.map((fav) => {
                                const labels = getFavoriteLabels(fav);
                                return (
                                <li key={fav.id} className="w-full">
                                    <div className="group/fav-item flex items-center gap-2 rounded-xl px-1 py-1 transition-colors">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-[0.82rem] font-semibold text-foreground transition hover:bg-primary/10 group-hover/fav-item:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                                            onClick={() => onFavoriteSelect(fav)}
                                            aria-label={`Select favorite: ${labels.full}`}
                                            title={labels.full}
                                        >
                                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <UnitIcon category={fav.category} className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <ResponsiveFavoriteLabel
                                                    fullLabel={labels.full}
                                                    compactLabel={labels.compact}
                                                />
                                            </span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="ml-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-0 transition invisible group-hover/fav-item:visible group-hover/fav-item:opacity-100 group-focus-within/fav-item:visible group-focus-within/fav-item:opacity-100 hover:bg-destructive hover:text-white focus-visible:bg-destructive focus-visible:text-white focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:opacity-100 focus-visible:visible"
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                onRemoveFavorite(fav.id);
                                            }}
                                            aria-label={`Remove favorite ${labels.full}`}
                                            title={`Remove ${labels.full}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            );})}
                        </ul>
                    </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';
