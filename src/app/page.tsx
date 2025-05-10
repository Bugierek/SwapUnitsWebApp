

'use client'; 

import * as React from 'react';
import Script from 'next/script';
import Link from 'next/link';

import { UnitConverter, type UnitConverterHandle } from "@/components/unit-converter";
import { BookmarkButton } from '@/components/bookmark-button';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from "@/components/footer";
import { PresetList } from "@/components/preset-list"; 
import { UnitIcon } from '@/components/unit-icon'; 
import { getFilteredAndSortedPresets } from '@/lib/unit-data'; 
import type { Preset, ConverterMode, UnitCategory } from '@/types'; 

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
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer rate, Bitcoin, Ethereum, EM Frequency, and Sound Frequency.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any', // Web-based
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com',
  featureList: [
    'Unit Conversion',
    'Length Conversion (m, ft, km, mi, in, cm, µm, nm)',
    'Mass Conversion (kg, lb, g, oz, t, mg)',
    'Temperature Conversion (°C, °F, K)',
    'Time Conversion (s, min, hr, day, ms, µs, ns, ps, fs, yr)', 
    'Pressure Conversion (Pa, kPa, bar, atm, psi)',
    'Area Conversion (m², ft², km², mi², ha, acre, cm², mm²)',
    'Volume Conversion (L, mL, m³, ft³, gal, qt, pt, cup, fl oz, tbsp, tsp, km³, cm³, mm³, in³)',
    'Energy Conversion (J, kJ, cal, kcal, kWh, BTU, Wh, eV, ft⋅lb)',
    'Speed Conversion (m/s, km/h, mph, kn, ft/s)',
    'Fuel Economy Conversion (km/L, L/100km, MPG US, MPG UK)',
    'Data Storage Conversion (B, KB, MB, GB, TB, PB, bit)',
    'Data Transfer Rate Conversion (bps, Kbps, Mbps, Gbps, Tbps, B/s, KB/s, MB/s, GB/s, TB/s)',
    'Bitcoin Conversion (BTC, sat)',
    'Ethereum Conversion (ETH, gwei, wei)',
    'EM Frequency & Wavelength Conversion (THz, GHz, MHz, kHz, Hz, mHz, km (λ), m (λ), cm (λ), mm (λ), µm (λ), nm (λ))',
    'Sound Frequency & Wavelength Conversion (THz, GHz, MHz, kHz, Hz, mHz, km (λ), m (λ), cm (λ), mm (λ), µm (λ), nm (λ))',
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
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, satoshi, ethereum, gwei, wei, metric, imperial, scientific notation, presets, femtosecond, picosecond, nanosecond, microsecond, EM frequency, sound frequency, wavelength, THz, GHz, nm, Pa, yr",
};


export default function Home() {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const unitConverterRef = React.useRef<UnitConverterHandle>(null);
  const [converterMode, setConverterMode] = React.useState<ConverterMode>('basic'); // State for converter mode

  // Get presets based on current converter mode
  const displayPresets = React.useMemo(() => getFilteredAndSortedPresets(), []);


  const onMobilePresetSelect = (preset: Preset) => {
    if (unitConverterRef.current) {
      // Check if preset requires advanced mode and switch if necessary
      const fromUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.fromUnit);
      const toUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.toUnit);
      if ((fromUnitDetails?.mode === 'advanced' || toUnitDetails?.mode === 'advanced') && converterMode === 'basic') {
        setConverterMode('advanced');
      }
      // Delay preset selection slightly to allow mode switch to propagate if it happened
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
      // Check if preset requires advanced mode and switch if necessary
      const fromUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.fromUnit);
      const toUnitDetails = unitData[preset.category]?.units.find(u => u.symbol === preset.toUnit);
      if ((fromUnitDetails?.mode === 'advanced' || toUnitDetails?.mode === 'advanced') && converterMode === 'basic') {
        setConverterMode('advanced');
      }
       // Delay preset selection slightly to allow mode switch to propagate
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
      // Always reset to basic mode and apply initial preset when logo is clicked
      setConverterMode('basic'); 
      // Use a microtask to ensure mode state update is processed before preset selection
      Promise.resolve().then(() => {
        if (unitConverterRef.current) {
          unitConverterRef.current.handlePresetSelect(initialPreset);
        }
      });
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
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  
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
        !isMobile && "md:grid-cols-[1fr_auto] md:gap-8" 
      )}>
        <main className="flex flex-col items-center w-full md:col-span-1" role="main">
          <Toaster />
          <UnitConverter 
            ref={unitConverterRef} 
            className="h-full"
            converterMode={converterMode} // Pass mode state
            setConverterMode={setConverterMode} // Pass function to set mode
          />
        </main>

        {!isMobile && (
          <aside className="hidden md:block md:col-span-1 max-w-[280px]" role="complementary">
            <PresetList onPresetSelect={handlePresetSelectFromDesktop} className="h-full"/>
          </aside>
        )}
      </div>
      <Footer />
    </>
  );
}
