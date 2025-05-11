
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed: import { getFilteredAndSortedPresets } from "@/lib/unit-data"; 
import type { Preset, FavoriteItem } from '@/types'; 
import { List, Star, X } from 'lucide-react'; // Added Star and X icons
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Progress } from '@/components/ui/progress';

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
    // Removed: const displayPresets = getFilteredAndSortedPresets(); 

    return (
        <Card className={cn("shadow-lg hidden md:flex md:flex-col w-full max-w-xs", className)} aria-label="Favorite and Common Unit Conversions">
            {/* My Favorites Section */}
            <CardHeader className="p-4 pb-2 flex-shrink-0"> {/* Adjusted padding */}
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold text-accent flex items-center gap-2">
                        <Star className="h-5 w-5" aria-hidden="true" />
                        My Favorites
                    </CardTitle>
                    {onClearAllFavorites && favorites.length > 0 && !isLoadingFavorites && (
                        <Button variant="outline" size="sm" onClick={onClearAllFavorites} aria-label="Clear all favorites">
                            Clear All
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-grow overflow-hidden"> {/* Adjusted padding */}
                {isLoadingFavorites ? (
                     <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                        <p className="text-sm text-muted-foreground">Loading favorites...</p>
                        <Progress value={50} className="w-full" aria-label="Loading progress" />
                    </div>
                ): favorites.length === 0 ? (
                    <p className="text-sm text-muted-foreground h-full flex items-center justify-center">
                        Saved favorites will appear here.
                    </p>
                ) : (
                    <ScrollArea className="h-full pr-1"> {/* h-full makes ScrollArea fill its CardContent parent */}
                        <ul className="space-y-1">
                            {favorites.map((fav) => (
                                <li key={fav.id} className="flex items-center justify-between gap-1 group/fav-item">
                                  <Button
                                      variant="ghost"
                                      className="flex-grow justify-start text-left h-auto py-2 px-3 hover:bg-accent hover:text-accent-foreground overflow-hidden whitespace-normal flex items-center gap-2 text-sm"
                                      onClick={() => onFavoriteSelect(fav)}
                                      aria-label={`Select favorite: ${fav.name}`}
                                  >
                                      <UnitIcon category={fav.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                                       <div className="flex-1 min-w-0"> 
                                          <p className="font-medium break-words">{fav.name}</p>
                                          {/* Removed category display: <p className="text-xs text-muted-foreground break-words">{fav.category}</p> */}
                                      </div>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/fav-item:opacity-100 focus:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        onRemoveFavorite(fav.id);
                                    }}
                                    aria-label={`Remove favorite: ${fav.name}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                )}
            </CardContent>

            <div className="px-4 flex-shrink-0">
                <Separator className="my-0" />
            </div>

            {/* Common Conversions Section */}
            <CardHeader className="p-4 pb-2 flex-shrink-0"> {/* Adjusted padding */}
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <List className="h-5 w-5" aria-hidden="true" />
                    Common Conversions
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-grow overflow-hidden"> 
                 {presetsToDisplay.length === 0 && !isLoadingFavorites ? (
                     <p className="text-sm text-muted-foreground h-full flex items-center justify-center">
                        No common conversions to show.
                    </p>
                ) : (
                    <ScrollArea className="h-full pr-1"> 
                        <ul className="space-y-2">
                            {presetsToDisplay.map((preset, index) => ( // Use presetsToDisplay
                                <li key={`${preset.category}-${preset.name}-${index}`}>
                                  <Button
                                      variant="ghost"
                                      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-center gap-2 text-sm" 
                                      onClick={() => onPresetSelect(preset)} 
                                      aria-label={`Select preset: ${preset.name}`}
                                  >
                                      <UnitIcon category={preset.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                                      <span className="flex-1">{preset.name}</span>
                                  </Button>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';
