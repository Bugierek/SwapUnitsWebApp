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
import AdPlaceholder from "@/components/ad-placeholder"; 
import { UnitIcon } from '@/components/unit-icon'; 
import { unitData, getFilteredAndSortedPresets, getUnitsForCategoryAndMode } from '@/lib/unit-data'; 
import type { Preset, ConverterMode, UnitCategory, ConversionHistoryItem } from '@/types'; 

import { useIsMobile } from '@/hooks/use-mobile';
import { useConversionHistory } from '@/hooks/use-conversion-history';
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
import { Menu, RefreshCw, List, Settings2, History as HistoryIconLucide, Copy } from 'lucide-react'; 
import { cn } from '@/lib/utils';


const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SwapUnits - Free Online Unit Converter',
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer rate, Bitcoin, Ethereum, EM Frequency, and Sound Frequency.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com',
  featureList: [
    'Unit Conversion', 'Length Conversion', 'Mass Conversion', 'Temperature Conversion', 'Time Conversion', 
    'Pressure Conversion', 'Area Conversion', 'Volume Conversion', 'Energy Conversion', 'Speed Conversion', 
    'Fuel Economy Conversion', 'Data Storage Conversion', 'Data Transfer Rate Conversion', 
    'Bitcoin Conversion', 'Ethereum Conversion', 'EM Frequency & Wavelength Conversion', 
    'Sound Frequency & Wavelength Conversion', 'Metric Units', 'Imperial Units', 'Scientific Notation Option',
    'Common Conversion Presets', 'Copy to Clipboard', 'Responsive Design', 'Basic and Advanced modes',
    'Conversion History'
  ],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, satoshi, ethereum, gwei, wei, metric, imperial, scientific notation, presets, femtosecond, picosecond, nanosecond, microsecond, EM frequency, sound frequency, wavelength, THz, GHz, nm, Pa, yr, history",
};


export default function Home() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const unitConverterRef = React.useRef<UnitConverterHandle>(null);
  const [converterMode, setConverterMode] = React.useState<ConverterMode>('basic');
  const { history, addHistoryItem, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();

  const displayPresets = React.useMemo(() => getFilteredAndSortedPresets(), []);

  const handleResultCopied = React.useCallback((data: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => {
    addHistoryItem(data);
  }, [addHistoryItem]);

  const onHistoryItemSelect = React.useCallback((item: ConversionHistoryItem) => {
    if (unitConverterRef.current) {
      const fromUnitDetails = getUnitsForCategoryAndMode(item.category, 'advanced').find(u => u.symbol === item.fromUnit);
      const toUnitDetails = getUnitsForCategoryAndMode(item.category, 'advanced').find(u => u.symbol === item.toUnit);
      
      let targetMode = converterMode;
      if (fromUnitDetails?.mode === 'advanced' || toUnitDetails?.mode === 'advanced') {
        targetMode = 'advanced';
      } else if (fromUnitDetails?.mode === 'basic' && toUnitDetails?.mode === 'basic' && converterMode === 'advanced') {
        const allUnitsInCat = getUnitsForCategoryAndMode(item.category, 'advanced');
        const isFromUnitStrictlyBasic = allUnitsInCat.find(u=>u.symbol === item.fromUnit)?.mode === 'basic';
        const isToUnitStrictlyBasic = allUnitsInCat.find(u=>u.symbol === item.toUnit)?.mode === 'basic';
        if(isFromUnitStrictlyBasic && isToUnitStrictlyBasic){
            targetMode = 'basic';
        }
      }

      if (targetMode !== converterMode) {
        setConverterMode(targetMode);
      }
      
      setTimeout(() => {
        if (unitConverterRef.current) {
          unitConverterRef.current.applyHistorySelect(item);
        }
      }, 0); 
    }
    if (isMobile) setIsSheetOpen(false);
  }, [converterMode, isMobile, setConverterMode]);


  const onMobilePresetSelect = (preset: Preset) => {
    if (unitConverterRef.current) {
      const fromUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.fromUnit);
      const toUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.toUnit);
      if ((fromUnitDetails?.mode === 'advanced' || toUnitDetails?.mode === 'advanced') && converterMode === 'basic') {
        setConverterMode('advanced');
      }
      setTimeout(() => {
        if (unitConverterRef.current) {
         unitConverterRef.current.handlePresetSelect(preset);
        }
      },0);
    }
    setIsSheetOpen(false); 
  };

  const handlePresetSelectFromDesktop = (preset: Preset) => {
    if (unitConverterRef.current) {
      const fromUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.fromUnit);
      const toUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.toUnit);
      if ((fromUnitDetails?.mode === 'advanced' || toUnitDetails?.mode === 'advanced') && converterMode === 'basic') {
        setConverterMode('advanced');
      }
      setTimeout(() => {
         if (unitConverterRef.current) {
            unitConverterRef.current.handlePresetSelect(preset);
         }
      }, 0);
    }
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); 
    if (unitConverterRef.current) {
      const initialPreset: Preset = {
        category: 'Mass' as UnitCategory, 
        fromUnit: 'kg',
        toUnit: 'g',
        name: 'InitialReset', 
      };
      setConverterMode('basic'); 
      Promise.resolve().then(() => {
        if (unitConverterRef.current) {
          unitConverterRef.current.handlePresetSelect(initialPreset);
        }
      });
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

      <header className="bg-background p-3 border-b flex items-center justify-between shadow-sm relative">
        <div className="flex items-center w-1/3"> 
          {isMobile && (
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

                  <div className="p-4 border-b">
                    <h3 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                        Mode
                    </h3>
                    <div className="flex w-full">
                       <SheetClose asChild>
                        <Button
                          variant={converterMode === 'basic' ? 'secondary' : 'outline'}
                          onClick={() => { if (converterMode !== 'basic') setConverterMode('basic'); }}
                          aria-pressed={converterMode === 'basic'}
                          className="flex-1 px-5 text-sm rounded-r-none"
                        > Basic </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          variant={converterMode === 'advanced' ? 'secondary' : 'outline'}
                          onClick={() => { if (converterMode !== 'advanced') setConverterMode('advanced'); }}
                          aria-pressed={converterMode === 'advanced'}
                          className="flex-1 px-5 text-sm rounded-l-none"
                        > Advanced </Button>
                      </SheetClose>
                    </div>
                  </div>
                  
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
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No history yet.</p>
                    ) : (
                      <ul className="space-y-1"> 
                        {history.map((item) => ( 
                          <li key={item.id} className="flex items-center justify-between gap-1 group/history-item-mobile">
                             <SheetClose asChild>
                              <Button
                                  variant="ghost"
                                  className="flex-grow justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-start gap-2 text-sm"
                                  onClick={() => onHistoryItemSelect(item)}
                                  aria-label={`Apply conversion: ${formatHistoryNumberMobile(item.fromValue)} ${item.fromUnit} to ${formatHistoryNumberMobile(item.toValue)} ${item.toUnit}`}
                              >
                                  <UnitIcon category={item.category} className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                   <div className="flex-1 min-w-0">
                                      <p className="font-medium break-words"> 
                                          {formatHistoryNumberMobile(item.fromValue)} {item.fromUnit} → {formatHistoryNumberMobile(item.toValue)} {item.toUnit}
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
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover/history-item-mobile:opacity-100 focus:opacity-100 transition-opacity"
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

                  <div className="p-4">
                    <h3 className="text-md font-semibold text-foreground mb-3">Common Conversions</h3>
                    <ul className="space-y-2">
                      {displayPresets.map((preset, index) => (
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
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
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
        "flex-grow grid grid-cols-1 w-full max-w-7xl mx-auto items-stretch",
        "pt-2 pb-4 px-4 sm:pt-4 sm:pb-8 sm:px-8 md:pt-6 md:pb-12 md:px-12 lg:pt-8 lg:pb-16 lg:px-16 xl:pt-10 xl:pb-20 xl:px-20",
        !isMobile && "md:grid-cols-[180px_1fr_auto] md:gap-8" 
      )}>
        {!isMobile && (
          <aside className="hidden md:block max-w-[180px]" role="complementary">
            <HistoryList 
                items={history} 
                onHistorySelect={onHistoryItemSelect} 
                onClearHistory={clearHistory} 
                className="h-full"
                isLoading={isLoadingHistory}
            />
          </aside>
        )}
        <main className="flex flex-col items-center w-full" role="main">
          <Toaster />
          <UnitConverter 
            ref={unitConverterRef} 
            className="h-full" 
            converterMode={converterMode}
            setConverterMode={setConverterMode}
            onResultCopied={handleResultCopied}
          />
        </main>
        {!isMobile && (
          <aside className="hidden md:block max-w-[200px]" role="complementary">
            <PresetList onPresetSelect={handlePresetSelectFromDesktop} className="h-full"/>
          </aside>
        )}
      </div>
      {!isMobile && <AdPlaceholder />}
      <Footer />
      {isMobile && <AdPlaceholder />}

    </>
  );
}
