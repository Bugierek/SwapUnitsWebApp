'use client';

import * as React from 'react';
import Script from 'next/script';

import dynamic from 'next/dynamic';
import type { UnitConverterHandle } from '@/components/unit-converter';
import { SiteTopbar } from '@/components/site-topbar';
import { Toaster } from '@/components/ui/toaster';
import { PresetList } from '@/components/preset-list';
import { HistoryList } from '@/components/history-list';

// Lazy load Footer component since it's below the fold
const Footer = dynamic(() => import('@/components/footer').then(mod => mod.Footer), {
  ssr: false,
});
import { getFilteredAndSortedPresets } from '@/lib/unit-data';
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';
import type { Preset, UnitCategory, ConversionHistoryItem, FavoriteItem } from '@/types';

import { useConversionHistory } from '@/hooks/use-conversion-history';
import { useFavorites } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';

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
  keywords: 'unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, satoshi, metric, imperial, scientific notation, presets, history, favorites, atm, Pa, psi',
};

const MAX_FAVORITES_FOR_BUTTON_DISABLE = 5;

const UnitConverter = dynamic(
  () =>
    import('@/components/unit-converter').then((mod) => mod.UnitConverter),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] w-full items-center justify-center rounded-2xl border border-border/60 bg-muted text-sm text-muted-foreground">
        Loading converter…
      </div>
    ),
  },
);

const formatHistoryNumberMobile = (num: number): string => {
  if (!isFinite(num)) return '-';
  const absNum = Math.abs(num);

  if (absNum > 1e7 || (absNum !== 0 && absNum < 1e-7)) {
    const exp = num.toExponential(4).replace('e', 'E');
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

  const maxFractionDigits = absNum >= 1 ? 4 : 6;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
    style: 'decimal',
  });
};

export default function Home() {
  const { toast } = useToast();
  const unitConverterRef = React.useRef<UnitConverterHandle>(null);
  const { history, addHistoryItem, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();
  const { favorites, addFavorite, removeFavorite, clearAllFavorites, isLoadingFavorites } = useFavorites();

  const availablePresets = React.useMemo(() => getFilteredAndSortedPresets(favorites), [favorites]);
  const displayPresetCount = Math.max(0, 10 - favorites.length);
  const displayPresetsForListDesktop = React.useMemo(() => availablePresets.slice(0, displayPresetCount), [availablePresets, displayPresetCount]);

  const disableAddFavoriteButton = favorites.length >= MAX_FAVORITES_FOR_BUTTON_DISABLE;

  const handleResultCopied = React.useCallback((data: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => {
    const meta = data.category === 'SI Prefixes'
      ? {
          kind: 'si-prefix' as const,
          route: '/standards/nist-si-tenfold',
          fromPrefixSymbol: data.fromUnit,
          toPrefixSymbol: data.toUnit,
          inputText: `${data.fromValue} ${data.fromUnit} to ${data.toUnit}`,
        }
      : undefined;
    addHistoryItem(meta ? { ...data, meta } : data);
  }, [addHistoryItem]);

  const onMobileHistoryItemSelect = React.useCallback((item: ConversionHistoryItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.applyHistorySelect(item);
    }
  }, []);

  const onMobilePresetSelect = (preset: Preset | FavoriteItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.handlePresetSelect(preset);
    }
  };

  const onDesktopHistoryItemSelect = React.useCallback((item: ConversionHistoryItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.applyHistorySelect(item);
    }
  }, []);

  const onDesktopPresetSelect = (preset: Preset | FavoriteItem) => {
    if (unitConverterRef.current) {
      unitConverterRef.current.handlePresetSelect(preset);
    }
  };

  const handleToggleFavorite = React.useCallback((favoriteData: Omit<FavoriteItem, 'id'>) => {
    const existing = favorites.find(
      (fav) =>
        fav.category === favoriteData.category &&
        fav.fromUnit === favoriteData.fromUnit &&
        fav.toUnit === favoriteData.toUnit,
    );

    if (existing) {
      removeFavorite(existing.id);
    } else {
      addFavorite(favoriteData);
    }
  }, [addFavorite, removeFavorite, favorites]);

  const handleLogoClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (unitConverterRef.current) {
      const resetItem: ConversionHistoryItem = {
        id: 'reset',
        category: 'Mass',
        fromUnit: 'kg',
        toUnit: 'g',
        fromValue: 1,
        toValue: 1000,
        timestamp: Date.now(),
      };
      unitConverterRef.current.applyHistorySelect(resetItem);
      unitConverterRef.current.focusFinder();
    }
  }, []);

  const handleCopyHistoryItemMobile = React.useCallback(async (item: ConversionHistoryItem) => {
    const textToCopy = `${formatHistoryNumberMobile(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumberMobile(item.toValue)} ${item.toUnit}`;
    if (!textToCopy) return;

    const copied = await copyTextToClipboard(textToCopy);
    if (copied) {
      toast({
        title: 'Copied!',
        description: `Conversion "${textToCopy}" copied to clipboard.`,
        variant: 'confirmation',
        duration: 1500,
      });
    } else {
      toast({
        title: 'Copy Failed',
        description: 'Clipboard access is blocked. Please copy the text manually.',
        variant: 'destructive',
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

      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),transparent_60%)]" />
        <SiteTopbar
          handleLogoClick={handleLogoClick}
          history={history}
          isLoadingHistory={isLoadingHistory}
          onHistorySelect={onMobileHistoryItemSelect}
          clearHistory={clearHistory}
          onCopyHistoryItem={handleCopyHistoryItemMobile}
          favorites={favorites}
          isLoadingFavorites={isLoadingFavorites}
          onFavoriteSelect={onMobilePresetSelect}
          onRemoveFavorite={removeFavorite}
          onClearAllFavorites={clearAllFavorites}
          presets={displayPresetsForListDesktop}
          onPresetSelect={onDesktopPresetSelect}
        />

        <main className="flex-1">
          <Toaster />
          <div className="mx-auto flex w-full max-w-full flex-col gap-5 px-0.5 pb-14 pt-4 sm:px-3 sm:pt-8 lg:px-10 xl:max-w-[1480px]" id="top-nav-content">
            <div className="grid gap-7 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.95fr)] xl:items-start">
              <UnitConverter
                ref={unitConverterRef}
                className="min-h-[560px] lg:h-full"
                onResultCopied={handleResultCopied}
                onToggleFavorite={handleToggleFavorite}
                favorites={favorites}
                disableAddFavoriteButton={disableAddFavoriteButton}
              />

              {/* Right sidebar: history + favorites stacked on all xl+ */}
              <div className="hidden xl:flex h-full flex-col gap-6 xl:sticky xl:top-28">
                <HistoryList
                  items={history}
                  onHistorySelect={onDesktopHistoryItemSelect}
                  onClearHistory={clearHistory}
                  className="h-full flex-col"
                  isLoading={isLoadingHistory}
                />
                <PresetList
                  favorites={favorites}
                  onFavoriteSelect={onDesktopPresetSelect}
                  onRemoveFavorite={removeFavorite}
                  onClearAllFavorites={clearAllFavorites}
                  className="h-full flex-col"
                  isLoadingFavorites={isLoadingFavorites}
                />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
