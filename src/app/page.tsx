

'use client'; // This page is now a Client Component

import * as React from 'react';
import Script from 'next/script';
import Link from 'next/link';

import { UnitConverter, type UnitConverterHandle } from "@/components/unit-converter";
import { BookmarkButton } from '@/components/bookmark-button';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from "@/components/footer";
import { PresetList } from "@/components/preset-list"; // For desktop
import { UnitIcon } from '@/components/unit-icon'; // For mobile sheet
import { getFilteredAndSortedPresets } from '@/lib/unit-data'; // For mobile sheet
import type { Preset, ConverterMode } from '@/types'; // Added ConverterMode

import { useIsMobile } from '@/hooks/use-mobile';
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
import { Menu, RefreshCw, List } from 'lucide-react';
import { cn } from '@/lib/utils';


// JSON-LD Structured Data for WebApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SwapUnits - Free Online Unit Converter',
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer rate, and Bitcoin.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any', // Web-based
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com',
  featureList: [
    'Unit Conversion',
    'Length Conversion (m, ft, km, mi, in, cm)',
    'Mass Conversion (kg, lb, g, oz, t)',
    'Temperature Conversion (°C, °F, K)',
    'Time Conversion (s, min, hr, day, ms, µs, ns, ps, fs)', // Added advanced time units
    'Pressure Conversion (Pa, kPa, bar, atm, psi)',
    'Area Conversion (m², ft², km², mi², ha, acre)',
    'Volume Conversion (L, mL, m³, ft³, gal, qt, pt)',
    'Energy Conversion (J, kJ, cal, kcal, kWh, BTU)',
    'Speed Conversion (m/s, km/h, mph, kn)',
    'Fuel Economy Conversion (km/L, L/100km, MPG US, MPG UK)',
    'Data Storage Conversion (B, KB, MB, GB, TB)',
    'Data Transfer Rate Conversion (bps, Kbps, Mbps, Gbps, B/s, MB/s)',
    'Bitcoin Conversion (BTC, sat)',
    'Metric Units',
    'Imperial Units',
    'Scientific Notation Option',
    'Common Conversion Presets',
    'Copy to Clipboard',
    'Responsive Design',
    'Basic and Advanced conversion modes',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, satoshi, metric, imperial, scientific notation, presets, femtosecond, picosecond, nanosecond, microsecond",
};


export default function Home() {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const unitConverterRef = React.useRef<UnitConverterHandle>(null);
  const [converterMode, setConverterMode] = React.useState<ConverterMode>('basic');

  const displayPresets = React.useMemo(() => getFilteredAndSortedPresets(), []);

  const onMobilePresetSelect = (preset: Preset) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.handlePresetSelect(preset);
    }
    setIsSheetOpen(false); // Close the sheet after selection
  };

  const handlePresetSelectFromDesktop = (preset: Preset) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.handlePresetSelect(preset);
    }
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); 

    if (unitConverterRef.current) {
      const initialPreset: Preset = {
        category: 'Mass',
        fromUnit: 'kg',
        toUnit: 'g',
        name: 'InitialReset', 
      };
      unitConverterRef.current.handlePresetSelect(initialPreset);
      setConverterMode('basic'); // Reset mode to basic on logo click
    }
  };


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
                <Button variant="ghost" size="icon" aria-label="Open common conversions menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
                <ScrollArea className="h-full">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                      <List className="h-5 w-5" aria-hidden="true" />
                      Common Conversions
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
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

        <div className="flex items-center justify-end w-1/3">
            <BookmarkButton />
        </div>
      </header>

      <div className={cn(
        "flex-grow grid grid-cols-1 w-full max-w-7xl mx-auto items-stretch",
        "pt-2 pb-4 px-4 sm:pt-4 sm:pb-8 sm:px-8 md:pt-6 md:pb-12 md:px-12 lg:pt-8 lg:pb-16 lg:px-16 xl:pt-10 xl:pb-20 xl:px-20",
        "md:grid-cols-3 md:gap-8"
      )}>
        <main className="flex flex-col items-center w-full md:col-span-2" role="main">
          <Toaster />
          <UnitConverter 
            ref={unitConverterRef} 
            className="h-full"
            converterMode={converterMode}
            setConverterMode={setConverterMode}
          />
        </main>

        <aside className="hidden md:block md:col-span-1" role="complementary">
          <PresetList onPresetSelect={handlePresetSelectFromDesktop} className="h-full"/>
        </aside>
      </div>
      <Footer />
    </>
  );
}
