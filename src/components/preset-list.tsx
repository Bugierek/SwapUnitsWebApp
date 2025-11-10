
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed: import { getFilteredAndSortedPresets } from "@/lib/unit-data"; 
import type { Preset, FavoriteItem } from '@/types'; 
import { List, Star, X } from 'lucide-react'; // Added Star and X icons
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';

interface PresetListProps {
    presetsToDisplay: Preset[]; // Use this prop for the list of presets
    onPresetSelect: (preset: Preset) => void;
    favorites: FavoriteItem[];
    onFavoriteSelect: (favorite: FavoriteItem) => void;
    onRemoveFavorite: (favoriteId: string) => void;
    onClearAllFavorites?: () => void; 
    className?: string; 
    isLoadingFavorites?: boolean; 
}

export const PresetList = React.memo(function PresetListComponent({ 
    presetsToDisplay, // Use this prop
    onPresetSelect, 
    favorites,
    onFavoriteSelect,
    onRemoveFavorite,
    onClearAllFavorites,
    className,
    isLoadingFavorites 
}: PresetListProps) {
    const [isClearFavoritesDialogOpen, setIsClearFavoritesDialogOpen] = React.useState(false);
    const maxCommonVisible = React.useMemo(() => Math.max(0, 10 - favorites.length), [favorites.length]);
    const visibleCommonPresets = React.useMemo(() => presetsToDisplay.slice(0, maxCommonVisible), [presetsToDisplay, maxCommonVisible]);
    const hiddenCommonCount = Math.max(0, presetsToDisplay.length - visibleCommonPresets.length);
    // Removed: const displayPresets = getFilteredAndSortedPresets(); 

    const LABEL_CHAR_LIMIT = 30;
    const formatFavoriteLabel = (fav: FavoriteItem) => {
        const trimmed = fav.name.trim();
        return trimmed.length <= LABEL_CHAR_LIMIT ? trimmed : `${fav.fromUnit} → ${fav.toUnit}`;
    };
    const formatPresetLabel = (preset: Preset) => {
        const trimmed = preset.name.trim();
        return trimmed.length <= LABEL_CHAR_LIMIT ? trimmed : `${preset.fromUnit} → ${preset.toUnit}`;
    };

    return (
        <Card className={cn("flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm", className)} aria-label="Favorite and Common Unit Conversions">
            {/* My Favorites Section */}
            <CardHeader className="flex-shrink-0 border-b border-border/60 px-5 py-4">
                 <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Star className="h-4 w-4" aria-hidden="true" />
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
                                                            className="h-8 rounded-full border-border/60 bg-[hsl(var(--control-background))] px-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                                                    >
                                                            Clear All
                                                    </Button>

                                                    <Dialog open={isClearFavoritesDialogOpen} onOpenChange={setIsClearFavoritesDialogOpen}>
                                                        <DialogContent className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Clear all favorites?</DialogTitle>
                                                                <DialogDescription>
                                                                    This will remove all saved favorite conversions. This action cannot be undone.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                                <Button variant="outline" size="sm" onClick={() => setIsClearFavoritesDialogOpen(false)} className="rounded-lg border-border/60 bg-[hsl(var(--control-background))]">Cancel</Button>
                                                                <Button variant="destructive" size="sm" onClick={() => { setIsClearFavoritesDialogOpen(false); onClearAllFavorites?.(); }} className="rounded-lg">Yes, clear</Button>
                                                            </DialogFooter>
                                                            <DialogClose />
                                                        </DialogContent>
                                                    </Dialog>
                                                </>
                                        )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow px-5 pb-6 pt-5">
                {isLoadingFavorites ? (
                     <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center">
                        <p className="text-sm font-medium text-muted-foreground">Loading your saved conversions…</p>
                        <Progress value={50} className="h-1.5 w-full rounded-full bg-secondary" aria-label="Loading progress" />
                    </div>
                ): favorites.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-[hsl(var(--control-background))] px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-foreground">No favorites yet</p>
                        <p className="text-xs text-muted-foreground">Save a conversion from the main panel to build your list.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <ul className="space-y-2.5">
                            {favorites.map((fav) => {
                                const displayLabel = formatFavoriteLabel(fav);
                                return (
                                <li key={fav.id} className="w-full">
                                    <div className="group/fav-item flex items-center gap-2 rounded-xl px-1 py-1 transition-colors">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10 group-hover/fav-item:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                                            onClick={() => onFavoriteSelect(fav)}
                                            aria-label={`Select favorite: ${displayLabel}`}
                                        >
                                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <UnitIcon category={fav.category} className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                                {displayLabel}
                                            </span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-0 transition invisible group-hover/fav-item:visible group-hover/fav-item:opacity-100 group-focus-within/fav-item:visible group-focus-within/fav-item:opacity-100 hover:bg-destructive hover:text-white focus-visible:bg-destructive focus-visible:text-white focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:opacity-100 focus-visible:visible"
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                onRemoveFavorite(fav.id);
                                            }}
                                            aria-label={`Remove favorite ${displayLabel}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            );})}
                        </ul>
                    </div>
                )}
            </CardContent>
            {/* Common Conversions Section */}
            <CardHeader className="flex-shrink-0 border-t border-border/60 px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <List className="h-4 w-4" aria-hidden="true" />
                    </span>
                    Common conversions
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow px-5 pb-6 pt-5"> 
                 {visibleCommonPresets.length === 0 && !isLoadingFavorites ? (
                     <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-[hsl(var(--control-background))] px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-foreground">No suggestions yet</p>
                        <p className="text-xs text-muted-foreground">Add favorites to refine this list.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <ul className="space-y-2.5">
                            {visibleCommonPresets.map((preset, index) => {
                                const displayLabel = formatPresetLabel(preset);
                                return (
                                <li key={`${preset.category}-${preset.name}-${index}`} className="w-full">
                                  <Button
                                      variant="ghost"
                                      className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10"
                                      onClick={() => onPresetSelect(preset)} 
                                      aria-label={`Select preset: ${displayLabel}`}
                                  >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                          <UnitIcon category={preset.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                                      </span>
                                      <span className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                          {displayLabel}
                                      </span>
                                  </Button>
                                </li>
                            );})}
                        </ul>
                        {hiddenCommonCount > 0 && (
                            <p className="rounded-lg bg-[hsl(var(--control-background))] px-3 py-2 text-center text-[0.7rem] font-medium text-muted-foreground shadow-sm">
                                {hiddenCommonCount} more suggestions available once you clear space or use favorites.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';
