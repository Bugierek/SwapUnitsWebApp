import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryInfoBySlug } from '@/lib/category-info';
import { listAllConversionPairs, parseConversionPairSlug, normalizeUnitForSlug } from '@/lib/conversion-pairs';
import { unitData, getUnitsForCategory, getPresetsForCategory } from '@/lib/unit-data';
import { convertNumericValue } from '@/lib/conversion-math';
import type { UnitCategory } from '@/types';
import { ConversionPairPageContent } from '@/components/conversion-pair-page-content';
import { buildBreadcrumbJsonLd, buildFaqJsonLd, defaultFaqForPair } from '@/lib/structured-data';

type PageParams = {
  categorySlug: string;
  pairSlug: string;
}

type FxMode = 'latest' | 'historical';

const sampleMultipliers: number[] = [0.25, 0.5, 1, 2, 5, 10, 25, 100];
const temperatureSampleSet: number[] = [-40, -10, 0, 32, 68, 100];
const fuelEconomySampleSet: number[] = [2, 4, 6, 8, 10, 15, 20];

const buildSampleValues = (category: UnitCategory): number[] => {
  if (category === 'Temperature') {
    return temperatureSampleSet;
  }
  if (category === 'Fuel Economy') {
    return fuelEconomySampleSet;
  }
  return sampleMultipliers;
};

const formulaDescription = (
  category: UnitCategory,
  fromSymbol: string,
  toSymbol: string,
): string => {
  if (category === 'Temperature') {
    // Temperature formula descriptions
    const formulas = {
      'C->F': '°F = °C × 9/5 + 32',
      'F->C': '°C = (°F - 32) × 5/9',
      'C->K': 'K = °C + 273.15',
      'K->C': '°C = K - 273.15',
      'F->K': 'K = (°F - 32) × 5/9 + 273.15',
      'K->F': '°F = (K - 273.15) × 9/5 + 32'
    };
    const key = `${fromSymbol[0]}->${toSymbol[0]}`;
    if (formulas[key as keyof typeof formulas]) {
      return `Use the formula: ${formulas[key as keyof typeof formulas]}`;
    }
    return 'Temperature conversions require special formulas with both multiplication and addition/subtraction steps.';
  }

  if (category === 'Data Storage') {
    return 'Data storage units use base-2 multipliers (powers of 1024) instead of base-10. For example, 1 KB = 1024 bytes.';
  }

  if (category === 'Fuel Economy') {
    if (fromSymbol.includes('/100') || toSymbol.includes('/100')) {
      return 'Converting between efficiency (km/L, MPG) and consumption (L/100km) units requires using the inverse relationship: consumption = 100 ÷ efficiency.';
    }
    return 'Direct fuel economy conversions use multiplication by the conversion factor to account for different distance and volume units.';
  }

  if (category === 'Data Transfer Rate') {
    if ((fromSymbol.includes('bps') && toSymbol.includes('/s')) || (fromSymbol.includes('/s') && toSymbol.includes('bps'))) {
      return 'When converting between bits (b) and bytes (B), remember that 1 byte = 8 bits.';
    }
  }

  return 'Most unit conversions use a simple multiplication or division by a conversion factor. The calculator shows the exact formula used.';
};

export function generateStaticParams() {
  return listAllConversionPairs().map(({ categorySlug, pairSlug }) => ({
    categorySlug,
    pairSlug,
  }));
}

type PageProps = {
  params: PageParams | Promise<PageParams>;
  searchParams?: URLSearchParams | { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await params to ensure they are fully resolved
  const resolvedParams = await Promise.resolve(params);
  const { categorySlug, pairSlug } = resolvedParams;
  
  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo) {
    return {};
  }

  const pair = parseConversionPairSlug(pairSlug);
  if (!pair) {
    return {};
  }

  const { fromSymbol, toSymbol } = pair;
  const title = `${fromSymbol} ↔ ${toSymbol} Conversion | ${categoryInfo.title}`;
  const description = `Convert between ${fromSymbol} and ${toSymbol} with tables, quick examples, and an interactive calculator for ${categoryInfo.title.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/conversions/${categorySlug}/${pairSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function ConversionPairPage({ params, searchParams }: PageProps) {
  // Await params to ensure they are fully resolved
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { categorySlug, pairSlug } = resolvedParams;
  const normalizedValue = (() => {
    if (resolvedSearchParams instanceof URLSearchParams) {
      return resolvedSearchParams.get('value') ?? undefined;
    }
    const raw = resolvedSearchParams?.value;
    if (Array.isArray(raw)) {
      return raw[0];
    }
    return raw;
  })();
  const parsedInitialValue = normalizedValue !== undefined ? Number(normalizedValue) : undefined;
  const initialValue = parsedInitialValue !== undefined && Number.isFinite(parsedInitialValue)
    ? parsedInitialValue
    : undefined;
  const initialFxDate = (() => {
    let raw: string | undefined;
    if (resolvedSearchParams instanceof URLSearchParams) {
      raw = resolvedSearchParams.get('fxDate') ?? undefined;
    } else {
      const val = resolvedSearchParams?.fxDate;
      raw = Array.isArray(val) ? val[0] : (val as string | undefined);
    }
    if (!raw) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(raw + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) ? null : d;
  })();
  const initialFxMode = (() => {
    let raw: string | undefined;
    if (resolvedSearchParams instanceof URLSearchParams) {
      raw = resolvedSearchParams.get('fxMode') ?? undefined;
    } else {
      const val = resolvedSearchParams?.fxMode;
      raw = Array.isArray(val) ? val[0] : (val as string | undefined);
    }
    return raw === 'historical' ? 'historical' : 'latest';
  })();

  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo) {
    notFound();
  }

  const pair = parseConversionPairSlug(pairSlug);
  if (!pair) {
    notFound();
  }

  const { fromSymbol, toSymbol } = pair;
  const unitEntry = unitData[categoryInfo.category];
  const units = unitEntry?.units ?? [];
  const normalizeForCompare = (val: string) => normalizeUnitForSlug(val).toLowerCase();
  const matchSymbol = (sym: string) =>
    units.find((unit) => unit.symbol === sym) ??
    units.find((unit) => unit.symbol.toLowerCase() === sym.toLowerCase()) ??
    units.find((unit) => normalizeForCompare(unit.symbol) === normalizeForCompare(sym));

  const fromUnitDetails = matchSymbol(fromSymbol);
  const toUnitDetails = matchSymbol(toSymbol);

  if (!fromUnitDetails || !toUnitDetails) {
    notFound();
  }

  // Use the canonical symbols from our data so calculations resolve (e.g., µ-prefixed units).
  const resolvedFromSymbol = fromUnitDetails.symbol;
  const resolvedToSymbol = toUnitDetails.symbol;

  const sampleInputs = buildSampleValues(categoryInfo.category);
  const exampleRows = sampleInputs
    .map((sample) => {
      const converted = convertNumericValue(categoryInfo.category, resolvedFromSymbol, resolvedToSymbol, sample);
      if (converted === null) return null;
      return {
        input: sample,
        output: converted,
      };
    })
    .filter((row): row is { input: number; output: number } => row !== null)
    .slice(0, 10);

  const reverseExampleRows = sampleInputs
    .map((sample) => {
      const converted = convertNumericValue(categoryInfo.category, resolvedToSymbol, resolvedFromSymbol, sample);
      if (converted === null) return null;
      return {
        input: sample,
        output: converted,
      };
    })
    .filter((row): row is { input: number; output: number } => row !== null)
    .slice(0, 10);

  const otherUnits = getUnitsForCategory(categoryInfo.category).filter(
    (unit) => unit.symbol !== fromSymbol && unit.symbol !== toSymbol,
  );

  const navbarPresets = getPresetsForCategory(categoryInfo.category).slice(0, 12);
  const formulaInsight = formulaDescription(categoryInfo.category, resolvedFromSymbol, resolvedToSymbol);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: categoryInfo.title, url: `/measurements/${categorySlug}` },
    { name: `${resolvedFromSymbol} to ${resolvedToSymbol}`, url: `/conversions/${categorySlug}/${pairSlug}` },
  ]);

  const faqJsonLd = buildFaqJsonLd(defaultFaqForPair(resolvedFromSymbol, resolvedToSymbol, categoryInfo.category));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ConversionPairPageContent
        categoryInfo={categoryInfo}
        fromSymbol={resolvedFromSymbol}
        toSymbol={resolvedToSymbol}
        fromUnit={{ symbol: resolvedFromSymbol, name: fromUnitDetails.name }}
        toUnit={{ symbol: resolvedToSymbol, name: toUnitDetails.name }}
        formulaInsight={formulaInsight}
        exampleRows={exampleRows}
        reverseExampleRows={reverseExampleRows}
        otherUnits={otherUnits.map((unit) => ({ symbol: unit.symbol, name: unit.name }))}
        navbarPresets={navbarPresets}
        initialValue={initialValue}
        initialFxDate={initialFxDate}
        initialFxMode={initialFxMode}
      />
    </>
  );
}
