
'use client'; 

import * as React from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { format } from 'date-fns';

import { UnitConverter, type UnitConverterHandle } from "@/components/unit-converter";
import { BookmarkButton } from '@/components/bookmark-button';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from "@/components/footer";
import { PresetList } from "@/components/preset-list"; 
import { HistoryList } from "@/components/history-list";
import { UnitIcon } from '@/components/unit-icon'; 
import { unitData, getFilteredAndSortedPresets } from '@/lib/unit-data'; 
import type { Preset, UnitCategory, ConversionHistoryItem, FavoriteItem } from '@/types';

import { useIsMobile } from '@/hooks/use-mobile';
import { useConversionHistory } from '@/hooks/use-conversion-history';
import { useFavorites } from '@/hooks/use-favorites'; 
import { useToast } from '@/hooks/use-toast'; 
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, RefreshCw, List, History as HistoryIconLucide, Copy, Star, X, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import SimpleCalculator from '@/components/simple-calculator'; 


const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SwapUnits - Free Online Unit Converter',
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer rate, Bitcoin.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com',
  featureList: [
    'Unit Conversion', 'Length Conversion', 'Mass Conversion', 'Temperature Conversion', 'Time Conversion', 
    'Pressure Conversion', 'Area Conversion', 'Volume Conversion', 'Energy Conversion', 'Speed Conversion', 
    'Fuel Economy Conversion', 'Data Storage Conversion', 'Data Transfer Rate Conversion', 
    'Bitcoin Conversion', 
    'Metric Units', 'Imperial Units', 'Scientific Notation Option',
    'Common Conversion Presets', 'Save Favorite Conversions', 'Copy to Clipboard', 'Responsive Design', 
    'Conversion History', 'Simple Calculator'
  ],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, satoshi, metric, imperial, scientific notation, presets, history, favorites, atm, Pa, psi", 
};

const MAX_FAVORITES_FOR_BUTTON_DISABLE = 5;

export default function Home() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const unitConverterRef = React.useRef<UnitConverterHandle>(null);
  const { history, addHistoryItem, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();
  const { favorites, addFavorite, removeFavorite, clearAllFavorites, isLoadingFavorites } = useFavorites(); 

  const availablePresets = React.useMemo(() => getFilteredAndSortedPresets(favorites), [favorites]);
  const displayPresetCount = Math.max(0, 12 - favorites.length);
  const displayPresetsForListDesktop = React.useMemo(() => availablePresets.slice(0, displayPresetCount), [availablePresets, displayPresetCount]);

  const disableAddFavoriteButton = favorites.length >= MAX_FAVORITES_FOR_BUTTON_DISABLE;

  const handleResultCopied = React.useCallback((data: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => {
    addHistoryItem(data);
  }, [addHistoryItem]);

  // Mobile sheet handlers
  const onMobileHistoryItemSelect = React.useCallback((item: ConversionHistoryItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.applyHistorySelect(item);
    }
    setIsSheetOpen(false);
  }, []);

  const onMobilePresetSelect = (preset: Preset | FavoriteItem) => { 
    if (unitConverterRef.current) {
        unitConverterRef.current.handlePresetSelect(preset);
    }
    setIsSheetOpen(false);
  };

  // Desktop sidebar handlers
  const onDesktopHistoryItemSelect = React.useCallback((item: ConversionHistoryItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.applyHistorySelect(item);
    }
    // No sheet to close for desktop
  }, []);

  const onDesktopPresetSelect = (preset: Preset | FavoriteItem) => { 
    if (unitConverterRef.current) {
        unitConverterRef.current.handlePresetSelect(preset);
    }
    // No sheet to close for desktop
  };
  
  const handleSaveFavorite = React.useCallback((favoriteData: Omit<FavoriteItem, 'id'>) => {
    addFavorite(favoriteData);
  }, [addFavorite]);


  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); 
    if (unitConverterRef.current) {
      const initialPreset: Preset = {
        category: 'Mass' as UnitCategory, 
        fromUnit: 'kg',
        toUnit: 'g',
        name: 'InitialReset', 
      };
      const resetItem: ConversionHistoryItem = {
        id: 'reset',
        category: 'Mass' as UnitCategory,
        fromUnit: 'kg',
        toUnit: 'g',
        fromValue: 1,
        toValue: 1000, 
        timestamp: Date.now()
      };
      unitConverterRef.current.applyHistorySelect(resetItem);
    }
  };

  const formatHistoryNumberMobile = (num: number): string => {
    if (!isFinite(num)) return '-';
    const absNum = Math.abs(num);
    if (absNum > 1e4 || (absNum < 1e-3 && absNum !== 0)) { 
      let exp = num.toExponential(2).replace('e', 'E'); 
      const match = exp.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
      if (match) {
          let coeff = match[1];
          const exponent = match[3];
          if (coeff.includes('.')) {
              coeff = coeff.replace(/0+$/, '');
              coeff = coeff.replace(/\.$/, '');
          }
          return coeff + exponent;
      }
      return exp;
    }
    const rounded = parseFloat(num.toFixed(3)); 
    if (rounded % 1 === 0) {
      return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  const handleCopyHistoryItemMobile = React.useCallback(async (item: ConversionHistoryItem) => {
    const textToCopy = `${formatHistoryNumberMobile(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumberMobile(item.toValue)} ${item.toUnit}`;
    if (!textToCopy || !navigator.clipboard) return;

    try {
        await navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Copied!",
            description: `Conversion "${textToCopy}" copied to clipboard.`,
            variant: "confirmation",
            duration: 1500,
        });
    } catch (err) {
        console.error('Failed to copy history item: ', err);
        toast({
            title: "Copy Failed",
            description: "Could not copy conversion to clipboard.",
            variant: "destructive",
        });
    }
  }, [toast]);


  return (
    <>
      <Script
        id="unit-converter-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-50 bg-background p-3 border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center w-1/3"> 
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
                <ScrollArea className="h-full">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                      <List className="h-5 w-5" aria-hidden="true" />
                      Menu
                    </SheetTitle>
                  </SheetHeader>

                  {/* History Section in Sheet */}
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
                          <HistoryIconLucide className="h-4 w-4" aria-hidden="true" />
                          History
                      </h3>
                      {history.length > 0 && (
                        <SheetClose asChild>
                          <Button variant="outline" size="xs" onClick={clearHistory} aria-label="Clear history" className="px-3 py-1.5">
                              Clear
                          </Button>
                        </SheetClose>
                      )}
                    </div>
                    {isLoadingHistory ? (
                       <p className="text-sm text-muted-foreground">Loading history...</p>
                    ) : history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No history yet.</p>
                    ) : (
                      <ul className="space-y-1"> 
                        {history.map((item) => ( 
                          <li key={item.id} className="flex items-center justify-between gap-1 group/history-item-mobile">
                             <SheetClose asChild>
                              <Button
                                  variant="ghost"
                                  className="flex-grow justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-start gap-2 text-sm"
                                  onClick={() => onMobileHistoryItemSelect(item)}
                                  aria-label={`Apply conversion: ${formatHistoryNumberMobile(item.fromValue)} ${item.fromUnit} to ${formatHistoryNumberMobile(item.toValue)} ${item.toUnit}`}
                              >
                                  <UnitIcon category={item.category} className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                   <div className="flex-1 min-w-0">
                                      <p className="font-medium break-words"> 
                                          {formatHistoryNumberMobile(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumberMobile(item.toValue)} ${item.toUnit}
                                      </p>
                                      <p className="text-xs text-muted-foreground break-words"> 
                                          {item.category} - {format(new Date(item.timestamp), 'MMM d, p')}
                                      </p>
                                  </div>
                              </Button>
                            </SheetClose>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    handleCopyHistoryItemMobile(item);
                                }}
                                aria-label="Copy this history item to clipboard"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <Separator className="my-0" />
                   
                  {/* My Favorites Section in Sheet */}
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-md font-semibold text-accent flex items-center gap-2">
                            <Star className="h-4 w-4" aria-hidden="true" />
                            My Favorites
                        </h3>
                        {favorites.length > 0 && (
                            <SheetClose asChild>
                                <Button variant="outline" size="xs" onClick={clearAllFavorites} aria-label="Clear all favorites" className="px-3 py-1.5">
                                    Clear All
                                </Button>
                            </SheetClose>
                        )}
                    </div>
                     {isLoadingFavorites ? (
                       <p className="text-sm text-muted-foreground">Loading favorites...</p>
                    ) : favorites.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No favorites yet.</p>
                    ) : (
                        <ul className="space-y-1">
                            {favorites.map((fav) => (
                                <li key={fav.id} className="flex items-center justify-between gap-1 group/fav-item-mobile">
                                    <SheetClose asChild>
                                        <Button
                                            variant="ghost"
                                            className="flex-grow justify-start text-left h-auto py-2 px-3 hover:bg-accent hover:text-accent-foreground overflow-hidden whitespace-normal flex items-center gap-2 text-sm"
                                            onClick={() => onMobilePresetSelect(fav)}
                                            aria-label={`Apply favorite: ${fav.name}`}
                                        >
                                            <UnitIcon category={fav.category} className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium break-words">{fav.name}</p>
                                            </div>
                                        </Button>
                                    </SheetClose>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFavorite(fav.id);
                                        }}
                                        aria-label={`Remove favorite: ${fav.name}`}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                  </div>
                  
                  <Separator className="my-0" />

                  {/* Common Conversions Section in Sheet */}
                  <div className="p-4">
                    <h3 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                        <List className="h-4 w-4" aria-hidden="true" />
                        Common Conversions
                    </h3>
                     {displayPresetsForListDesktop.length === 0 ? ( // Use desktop list for sheet as well for consistency
                        <p className="text-sm text-muted-foreground">No common conversions available.</p>
                    ) : (
                    <ul className="space-y-2">
                      {displayPresetsForListDesktop.map((preset, index) => (
                        <li key={`${preset.category}-${preset.name}-${index}`}>
                           <SheetClose asChild>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-center gap-2 text-sm"
                                onClick={() => onMobilePresetSelect(preset)}
                                aria-label={`Select preset: ${preset.name}`}
                            >
                                <UnitIcon category={preset.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="flex-1">{preset.name}</span>
                            </Button>
                           </SheetClose>
                        </li>
                      ))}
                    </ul>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Refresh unit converter and return to initial state"
          >
            <RefreshCw
              className="h-5 w-5 text-primary transition-transform duration-300 ease-in-out group-hover:rotate-180"
              aria-hidden="true"
            />
            <h1 className="font-bold text-lg text-foreground">SWAPUNITS</h1>
          </Link>
        </div>

        <div className="flex items-center justify-end w-1/3 gap-2">
          <BookmarkButton />
        </div>
      </header>

      <div className={cn(
        "flex-grow grid grid-cols-1 md:grid-cols-[minmax(250px,300px)_1fr_minmax(250px,300px)] xl:grid-cols-[minmax(300px,350px)_1fr_minmax(300px,350px)] 2xl:grid-cols-[minmax(350px,400px)_1fr_minmax(350px,400px)]",
        "gap-4 md:gap-6 lg:gap-8 w-full max-w-screen-2xl mx-auto items-stretch", // Use items-stretch if cards are h-full
        "pt-2 pb-4 px-4",
        "sm:pt-4 sm:pb-8 sm:px-8",
        "md:pt-6 md:pb-12 md:px-6", // Adjusted md padding
        "lg:pt-8 lg:pb-16 lg:px-8", // Adjusted lg padding
        "xl:pt-10 xl:pb-20 xl:px-10", // Adjusted xl padding
        "2xl:pt-12 2xl:pb-24 2xl:px-12" // Adjusted 2xl padding
      )}>
        <HistoryList
            items={history}
            onHistorySelect={onDesktopHistoryItemSelect}
            onClearHistory={clearHistory}
            className="hidden md:flex md:flex-col h-full" // max-h-[calc(100vh-120px)] or similar if independent scrolling is needed
            isLoading={isLoadingHistory}
        />
        <main className="flex flex-col items-center w-full md:min-w-[400px] lg:min-w-[500px]" role="main"> {/* Ensure main content has some min-width */}
          <Toaster />
          <UnitConverter 
            ref={unitConverterRef} 
            className="h-full w-full" 
            onResultCopied={handleResultCopied}
            onSaveFavorite={handleSaveFavorite}
            disableAddFavoriteButton={disableAddFavoriteButton} 
          />
        </main>
        <PresetList
            presetsToDisplay={displayPresetsForListDesktop}
            onPresetSelect={onDesktopPresetSelect}
            favorites={favorites}
            onFavoriteSelect={onDesktopPresetSelect} // Assuming same handler logic for favorites
            onRemoveFavorite={removeFavorite}
            onClearAllFavorites={clearAllFavorites}
            className="hidden md:flex md:flex-col h-full" // max-h-[calc(100vh-120px)] or similar for scrolling
            isLoadingFavorites={isLoadingFavorites}
        />
      </div>
      
      <Footer />
    </>
  );
}
